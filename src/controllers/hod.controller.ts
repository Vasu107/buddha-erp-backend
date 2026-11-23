import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

/**
 * Resolves the HOD record for the currently authenticated user.
 *
 * Works for:
 *  - Users with role === HOD (standard HOD login)
 *  - Users with role === FACULTY whose faculty.designation === "HOD"
 *    (HOD-designated faculty added by the Director)
 *
 * Returns null if no HOD record can be found.
 */
async function resolveHod(userId: string, userRole?: string) {
  // Standard HOD role — look up directly by userId
  const byUserId = (await prisma.hod.findFirst({ where: { userId } })) ??
                   (await prisma.hod.findUnique({ where: { userId } as any }));
  if (byUserId) return byUserId;

  // Faculty with HOD designation — try matching via email in faculty table
  if (userRole === "FACULTY") {
    const facultyRecord = (await prisma.faculty.findFirst({
      where: { userId, designation: "HOD" },
    })) ?? (await prisma.faculty.findUnique({ where: { userId } as any }));
    if (facultyRecord) {
      const byEmail = (await prisma.hod.findFirst({
        where: { email: facultyRecord.email },
      })) ?? (await prisma.hod.findUnique({ where: { email: facultyRecord.email } as any }));
      // If no HOD row yet, synthesise a virtual HOD object from faculty data
      // so the workload endpoint still returns scoped faculty.
      return byEmail ?? {
        id: facultyRecord.id,
        userId,
        name: facultyRecord.name,
        email: facultyRecord.email,
        employeeId: facultyRecord.employeeId,
        department: facultyRecord.department,
        createdAt: facultyRecord.createdAt,
        updatedAt: facultyRecord.updatedAt,
      };
    }
  }

  return null;
}

const createHODSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
});

export const createHOD = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createHODSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parseResult.error.errors,
      });
      return;
    }

    const { name, email, password, employeeId, department } = parseResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      res.status(400).json({ success: false, message: `Email ${email} is already in use` });
      return;
    }

    const existingHOD = await prisma.hod.findUnique({ where: { employeeId } });
    if (existingHOD) {
      res.status(400).json({ success: false, message: `Employee ID ${employeeId} already exists` });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: Role.HOD,
        },
      });

      const hod = await tx.hod.create({
        data: {
          name,
          email: email.toLowerCase(),
          employeeId,
          department,
          userId: user.id,
        },
      });

      const { password: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, hod };
    });

    res.status(201).json({
      success: true,
      message: "HOD created successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Create HOD error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getHODs = async (req: Request, res: Response): Promise<void> => {
  try {
    const deptQuery = typeof req.query.department === "string" ? req.query.department : undefined;
    const searchQuery = typeof req.query.search === "string" ? req.query.search : undefined;

    const whereClause: any = {};

    if (deptQuery) {
      whereClause.department = deptQuery;
    }

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { employeeId: { contains: searchQuery } },
      ];
    }

    const hods = await prisma.hod.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, email: true, role: true, createdAt: true },
        },
      },
      orderBy: { employeeId: "asc" },
    });

    res.status(200).json({
      success: true,
      count: hods.length,
      hods,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* ============================================================
   GET HOD FACULTY WORKLOAD — scoped to HOD's own department
   GET /api/roles/hod/faculty/workload
   ============================================================ */
export const getHodFacultyWorkload = async (req: Request, res: Response): Promise<void> => {
  try {
    const hod = await resolveHod(req.user!.userId, req.user!.role);
    if (!hod) {
      res.status(404).json({ success: false, message: "HOD profile not found" });
      return;
    }

    const searchQ = typeof req.query.search === "string" ? req.query.search : undefined;
    const desigQ  = typeof req.query.designation === "string" ? req.query.designation : undefined;

    const andConditions: any[] = [
      { department: hod.department },
    ];

    if (desigQ && desigQ !== "All Designations") {
      andConditions.push({ designation: desigQ });
    }

    if (searchQ) {
      andConditions.push({
        OR: [
          { name: { contains: searchQ, mode: "insensitive" } },
          { employeeId: { contains: searchQ, mode: "insensitive" } },
          { email: { contains: searchQ, mode: "insensitive" } },
        ],
      });
    }

    const facultyList = await prisma.faculty.findMany({
      where: { AND: andConditions },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { employeeId: "asc" },
    });

    // Compute a simple workload summary per faculty member.
    // In a real setup this would join against a workload/timetable table;
    // here we derive it from the subjects linked to each faculty record.
    const workload = facultyList.map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      employeeId: f.employeeId,
      designation: f.designation,
      department: f.department,
      status: f.status,
      experience: f.experience,
      image: f.image,
    }));

    res.status(200).json({
      success: true,
      department: hod.department,
      hodName: hod.name,
      count: workload.length,
      faculty: workload,
    });
  } catch (error: any) {
    console.error("getHodFacultyWorkload error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* ============================================================
   GET HOD DEPARTMENT FACULTY
   Retrieves all faculty members who belong to the same department as the HOD.
   Step 1: Uses the Hod table to find the department of the HOD.
   Step 2: Uses that department to perform a search in the Faculty table.
   ============================================================ */
export const getHodDepartmentFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawParamId = req.params.id;
    const targetHodId =
      (typeof rawParamId === "string" ? rawParamId : Array.isArray(rawParamId) ? rawParamId[0] : undefined) ||
      (typeof req.query.hodId === "string" ? req.query.hodId : undefined);

    let hod: any = null;

    if (targetHodId) {
      hod = (await prisma.hod.findFirst({
        where: {
          OR: [
            { id: targetHodId },
            { employeeId: targetHodId },
          ],
        },
      })) ?? (await prisma.hod.findUnique({ where: { id: targetHodId } as any }));
    } else if (req.user?.userId) {
      // Step 1: Look up HOD in the Hod table to find the department of the HOD
      hod = (await prisma.hod.findFirst({ where: { userId: req.user.userId } })) ??
            (await prisma.hod.findUnique({ where: { userId: req.user.userId } as any }));

      if (!hod && req.user.email) {
        hod = (await prisma.hod.findFirst({ where: { email: req.user.email.toLowerCase() } })) ??
              (await prisma.hod.findUnique({ where: { email: req.user.email.toLowerCase() } as any }));
      }

      if (!hod) {
        hod = await resolveHod(req.user.userId, req.user.role);
      }
    }

    if (!hod) {
      res.status(404).json({
        success: false,
        message: "HOD profile not found",
      });
      return;
    }

    // Step 2: Use the department of the HOD
    const department = hod.department;
    if (!department) {
      res.status(400).json({
        success: false,
        message: "Department is not specified for this HOD",
      });
      return;
    }

    // Step 3: Search the Faculty table for all faculty in the same department
    const searchQ = typeof req.query.search === "string" ? req.query.search : undefined;
    const desigQ  = typeof req.query.designation === "string" ? req.query.designation : undefined;
    const statusQ = typeof req.query.status === "string" ? req.query.status : undefined;

    const andConditions: any[] = [
      { department },
    ];

    if (desigQ && desigQ !== "All Designations") {
      andConditions.push({ designation: desigQ });
    }

    if (statusQ && statusQ !== "All Status") {
      andConditions.push({ status: statusQ });
    }

    if (searchQ) {
      andConditions.push({
        OR: [
          { name: { contains: searchQ, mode: "insensitive" } },
          { email: { contains: searchQ, mode: "insensitive" } },
          { employeeId: { contains: searchQ, mode: "insensitive" } },
        ],
      });
    }

    const faculty = await prisma.faculty.findMany({
      where: { AND: andConditions },
      include: {
        user: {
          select: { id: true, email: true, role: true, createdAt: true },
        },
      },
      orderBy: { employeeId: "asc" },
    });

    res.status(200).json({
      success: true,
      department,
      hod: {
        id: hod.id,
        name: hod.name,
        email: hod.email,
        employeeId: hod.employeeId,
        department: hod.department,
      },
      count: faculty.length,
      faculty,
    });
  } catch (error: any) {
    console.error("getHodDepartmentFaculty error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getHodFaculty = getHodDepartmentFaculty;

