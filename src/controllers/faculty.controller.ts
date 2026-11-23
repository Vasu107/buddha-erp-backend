import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";
import { getQueryString } from "../utils/param.utils";

/**
 * Resolves the department that should be used to scope faculty queries.
 *
 * Rules:
 *  1. Role === HOD  → look up hod table by userId (standard HOD login).
 *  2. Role === FACULTY and faculty.designation === "HOD"
 *     → treat them as an HOD: find their HOD record (by userId or email)
 *       and return that department; falls back to faculty.department if no
 *       HOD row exists yet.
 *  3. Any other role (DIRECTOR, STUDENT) → return null (unrestricted).
 */
async function getHodDepartment(req: Request): Promise<string | null> {
  const userId = req.user?.userId;
  const role   = req.user?.role;

  // ── Standard HOD role ──────────────────────────────────────────────────
  if (role === Role.HOD) {
    const hod = (await prisma.hod.findFirst({ where: { userId } })) ??
      (await prisma.hod.findUnique({ where: { userId } as any }));
    if (!hod) throw new Error("HOD profile not found for this account");
    return hod.department;
  }

  // ── Faculty with designation "HOD" ─────────────────────────────────────
  if (role === Role.FACULTY) {
    const facultyRecord = await prisma.faculty.findFirst({
      where: { userId, designation: "HOD" },
    });

    if (facultyRecord) {
      // Prefer HOD table (by userId, then by email) so the exact department
      // configured by the director is used.
      const hod =
        await prisma.hod.findFirst({ where: { userId } }) ??
        await prisma.hod.findFirst({ where: { email: facultyRecord.email } });

      // Return HOD table department if found; otherwise fall back to the
      // faculty record's own department field.
      return hod ? hod.department : facultyRecord.department;
    }
  }

  // Director / Student — unrestricted
  return null;
}

const createFacultySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional().default("faculty123"),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  branch: z.string().optional(),
  designation: z.string().optional().default("Assistant Professor"),
  status: z.string().optional().default("Active"),
  experience: z.number().optional().default(0),
  image: z.string().optional(),
});

export const createFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createFacultySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parseResult.error.errors,
      });
      return;
    }

    const {
      name,
      email,
      password,
      employeeId,
      department,
      branch,
      designation,
      status,
      experience,
      image,
    } = parseResult.data;

    const empId = (employeeId || `EMP${Date.now().toString().slice(-6)}`).trim();
    const lowerEmail = email.toLowerCase().trim();

    // If caller is HOD, always force department to their own department
    const hodDept = await getHodDepartment(req);
    const dept = hodDept ?? (department || branch || "Computer Science & Engineering (CSE)").trim();

    const existingUser = await prisma.user.findUnique({ where: { email: lowerEmail } });
    if (existingUser) {
      res.status(400).json({ success: false, message: `Email ${email} is already in use` });
      return;
    }

    const existingFaculty = await prisma.faculty.findUnique({ where: { employeeId: empId } });
    if (existingFaculty) {
      res.status(400).json({ success: false, message: `Employee ID ${empId} already exists` });
      return;
    }

    const hashedPassword = await bcrypt.hash(password || "faculty123", 10);
    const assignedRole = designation === "HOD" ? Role.HOD : Role.FACULTY;

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email: lowerEmail,
            password: hashedPassword,
            role: assignedRole,
          },
        });

        let facultyProfile = null;
        if (designation === "HOD") {
          await tx.hod.create({
            data: {
              name,
              email: lowerEmail,
              employeeId: empId,
              department: dept,
              userId: user.id,
            },
          });
        }

        facultyProfile = await tx.faculty.create({
          data: {
            name,
            email: lowerEmail,
            employeeId: empId,
            department: dept,
            designation: designation || "Assistant Professor",
            status: status || "Active",
            experience: experience || 0,
            image: image || null,
            userId: user.id,
          },
        });

        const { password: _, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, faculty: facultyProfile };
      });
    } catch (txError: any) {
      // Prisma unique constraint violation (P2002) — surface a clean 400
      if (txError?.code === "P2002") {
        const field = txError.meta?.target?.join(", ") ?? "field";
        res.status(400).json({
          success: false,
          message: `A record with this ${field} already exists. Please use a different email or employee ID.`,
        });
        return;
      }
      throw txError; // re-throw other DB errors to the outer catch
    }

    res.status(201).json({
      success: true,
      message: `${designation === "HOD" ? "HOD / " : ""}Faculty added successfully`,
      data: result,
    });
  } catch (error: any) {
    console.error("Create faculty error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

const bulkFacultyItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  // Email is validated loosely here — the frontend already normalises/auto-generates it
  email: z.string().min(3, "Email is required"),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  branch: z.string().optional(),
  designation: z.string().optional().default("Assistant Professor"),
  status: z.string().optional().default("Active"),
  experience: z.union([z.string(), z.number()]).transform((v) => Number(v) || 0).optional(),
  image: z.string().optional(),
});

export const bulkCreateFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { faculty: rawFaculty, password } = req.body as {
      faculty: any[];
      password?: string;
    };

    if (!Array.isArray(rawFaculty) || rawFaculty.length === 0) {
      res.status(400).json({ success: false, message: "No faculty data provided" });
      return;
    }

    const sharedPassword = (password || "faculty123").trim();
    const hashedPassword = await bcrypt.hash(sharedPassword, 10);

    // If caller is HOD, lock all imports to their own department
    const hodDept = await getHodDepartment(req);

    const created: any[] = [];
    const skipped: { row: number; reason: string; name: string }[] = [];

    const seenEmails = new Set<string>();
    const seenEmpIds = new Set<string>();

    for (let i = 0; i < rawFaculty.length; i++) {
      const raw = rawFaculty[i];

      // ── Per-row validation (skip bad rows, don't abort entire batch) ──
      const parseResult = bulkFacultyItemSchema.safeParse(raw);
      if (!parseResult.success) {
        const reason = parseResult.error.errors.map((e) => e.message).join("; ");
        skipped.push({ row: i + 1, name: raw?.name ?? `Row ${i + 1}`, reason });
        continue;
      }

      const row = parseResult.data;

      const lowerEmail = row.email.toLowerCase().trim();

      // Generate a truly unique employee ID when not provided
      const empId = (row.employeeId && row.employeeId.trim())
        ? row.employeeId.trim()
        : `EMP${Date.now().toString().slice(-6)}${String(i + 1).padStart(3, "0")}`;

      // HOD: override every row's department to their own; Director: use spreadsheet value
      const dept = hodDept ?? (row.department || row.branch || "Computer Science & Engineering (CSE)").trim();
      const designation = (row.designation || "Assistant Professor").trim();
      const status = (row.status || "Active").trim();
      const experience = Number(row.experience) || 0;

      // ── In-batch duplicate guards ──
      if (seenEmails.has(lowerEmail)) {
        skipped.push({ row: i + 1, name: row.name, reason: `Duplicate email "${lowerEmail}" in spreadsheet` });
        continue;
      }
      if (seenEmpIds.has(empId)) {
        skipped.push({ row: i + 1, name: row.name, reason: `Duplicate Employee ID "${empId}" in spreadsheet` });
        continue;
      }

      // ── Database duplicate guards ──
      const [existingUser, existingFaculty, existingHod] = await Promise.all([
        prisma.user.findUnique({ where: { email: lowerEmail } }),
        prisma.faculty.findUnique({ where: { employeeId: empId } }),
        prisma.hod.findUnique({ where: { employeeId: empId } }),
      ]);

      if (existingUser) {
        skipped.push({ row: i + 1, name: row.name, reason: `Email "${lowerEmail}" already in use` });
        continue;
      }
      if (existingFaculty || existingHod) {
        skipped.push({ row: i + 1, name: row.name, reason: `Employee ID "${empId}" already exists` });
        continue;
      }

      seenEmails.add(lowerEmail);
      seenEmpIds.add(empId);

      const assignedRole = designation === "HOD" ? Role.HOD : Role.FACULTY;

      try {
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name: row.name,
              email: lowerEmail,
              password: hashedPassword,
              role: assignedRole,
            },
          });

          if (designation === "HOD") {
            await tx.hod.create({
              data: {
                name: row.name,
                email: lowerEmail,
                employeeId: empId,
                department: dept,
                userId: user.id,
              },
            });
          }

          const facultyProfile = await tx.faculty.create({
            data: {
              name: row.name,
              email: lowerEmail,
              employeeId: empId,
              department: dept,
              designation,
              status,
              experience,
              image: row.image || null,
              userId: user.id,
            },
          });

          return facultyProfile;
        });

        created.push(result);
      } catch (err: any) {
        skipped.push({ row: i + 1, name: row.name, reason: err.message || "Failed to create faculty record" });
      }
    }

    res.status(201).json({
      success: true,
      message: `Imported ${created.length} faculty members. ${skipped.length} skipped.`,
      created: created.length,
      skipped,
    });
  } catch (error: any) {
    console.error("Bulk create faculty error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const deptQuery = typeof req.query.department === "string" ? req.query.department : undefined;
    const desigQuery = typeof req.query.designation === "string" ? req.query.designation : undefined;
    const statusQuery = typeof req.query.status === "string" ? req.query.status : undefined;
    const searchQuery = typeof req.query.search === "string" ? req.query.search : undefined;

    // Use an AND array so scalar filters and the search OR block don't
    // collide on the same Prisma where object (causes 500 on Neon/PostgreSQL).
    const andConditions: any[] = [];

    // HOD can only see faculty in their own department — ignore the query param
    const hodDept = await getHodDepartment(req);
    if (hodDept) {
      andConditions.push({ department: hodDept });
    } else if (deptQuery && deptQuery !== "All Departments") {
      andConditions.push({ department: deptQuery });
    }

    if (desigQuery && desigQuery !== "All Designations") {
      andConditions.push({ designation: desigQuery });
    }

    if (statusQuery && statusQuery !== "All Status") {
      andConditions.push({ status: statusQuery });
    }

    if (searchQuery) {
      andConditions.push({
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { email: { contains: searchQuery, mode: "insensitive" } },
          { employeeId: { contains: searchQuery, mode: "insensitive" } },
          { department: { contains: searchQuery, mode: "insensitive" } },
        ],
      });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const facultyList = await prisma.faculty.findMany({
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
      count: facultyList.length,
      faculty: facultyList,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const updateFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Faculty ID is required" });
      return;
    }
    const existingFaculty = await prisma.faculty.findUnique({ where: { id } });
    if (!existingFaculty) {
      res.status(404).json({ success: false, message: "Faculty not found" });
      return;
    }

    // HOD can only update faculty within their own department
    const hodDept = await getHodDepartment(req);
    if (hodDept && existingFaculty.department !== hodDept) {
      res.status(403).json({
        success: false,
        message: `Access denied: You can only manage faculty in your department (${hodDept}).`,
      });
      return;
    }

    const { name, email, department, designation, status, experience, image } = req.body;

    const updatedFaculty = await prisma.faculty.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email: email.toLowerCase() }),
        ...(department && { department }),
        ...(designation && { designation }),
        ...(status && { status }),
        ...(experience !== undefined && { experience: Number(experience) }),
        ...(image !== undefined && { image }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Faculty updated successfully",
      faculty: updatedFaculty,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Faculty ID is required" });
      return;
    }
    const faculty = await prisma.faculty.findUnique({ where: { id } });

    if (!faculty) {
      res.status(404).json({ success: false, message: "Faculty member not found" });
      return;
    }

    // HOD can only delete faculty within their own department
    const hodDept = await getHodDepartment(req);
    if (hodDept && faculty.department !== hodDept) {
      res.status(403).json({
        success: false,
        message: `Access denied: You can only manage faculty in your department (${hodDept}).`,
      });
      return;
    }

    if (faculty.userId) {
      await prisma.user.delete({ where: { id: faculty.userId } });
    } else {
      await prisma.faculty.delete({ where: { id } });
    }

    res.status(200).json({ success: true, message: "Faculty member deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
