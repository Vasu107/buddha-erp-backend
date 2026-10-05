import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional().default("123456"),
  role: z.enum(["DIRECTOR", "HOD", "FACULTY", "STUDENT"]),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  branch: z.string().optional(),
  rollNumber: z.string().optional(),
  rollNo: z.string().optional(),
  year: z.number().int().min(1).max(6).optional(),
  section: z.string().optional(),
  session: z.string().optional(),
  course: z.string().optional(),
  designation: z.string().optional(),
  status: z.string().optional(),
  experience: z.number().optional(),
  image: z.string().optional(),
});

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
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
      role,
      employeeId,
      department,
      branch,
      rollNumber,
      rollNo,
      year,
      section,
      session,
      course,
      designation,
      status,
      experience,
      image,
    } = parseResult.data;

    const creatorRole = req.user?.role;
    const lowerEmail = email.toLowerCase().trim();
    const dept = (department || branch || "CSE").trim();

    if (creatorRole === Role.STUDENT) {
      res.status(403).json({ success: false, message: "Students are not allowed to create users" });
      return;
    }

    if (creatorRole === Role.FACULTY && role !== Role.STUDENT) {
      res.status(403).json({ success: false, message: "Faculty can only create Student users" });
      return;
    }

    if (creatorRole === Role.HOD && (role === Role.DIRECTOR || role === Role.HOD)) {
      res.status(403).json({ success: false, message: "HOD can only create Faculty and Student users" });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existingUser) {
      res.status(400).json({ success: false, message: `User with email ${email} already exists` });
      return;
    }

    if (role === Role.DIRECTOR) {
      const empId = employeeId || `DIR-${Date.now().toString().slice(-4)}`;
      const existingDirector = await prisma.director.findUnique({ where: { employeeId: empId } });
      if (existingDirector) {
        res.status(400).json({ success: false, message: `Director with Employee ID ${empId} already exists` });
        return;
      }
    } else if (role === Role.HOD) {
      const empId = employeeId || `HOD-${Date.now().toString().slice(-4)}`;
      const existingHOD = await prisma.hod.findUnique({ where: { employeeId: empId } });
      if (existingHOD) {
        res.status(400).json({ success: false, message: `HOD with Employee ID ${empId} already exists` });
        return;
      }
    } else if (role === Role.FACULTY) {
      const empId = employeeId || `FAC-${Date.now().toString().slice(-4)}`;
      const existingFaculty = await prisma.faculty.findUnique({ where: { employeeId: empId } });
      if (existingFaculty) {
        res.status(400).json({ success: false, message: `Faculty with Employee ID ${empId} already exists` });
        return;
      }
    } else if (role === Role.STUDENT) {
      const rNum = (rollNumber || rollNo || `STU-${Date.now().toString().slice(-6)}`).trim();
      const existingStudent = await prisma.student.findUnique({ where: { rollNumber: rNum } });
      if (existingStudent) {
        res.status(400).json({ success: false, message: `Student with Roll Number ${rNum} already exists` });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password || "123456", 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: lowerEmail,
          password: hashedPassword,
          role: role as Role,
        },
      });

      let profileData = null;

      if (role === Role.DIRECTOR) {
        const empId = employeeId || `DIR-${Date.now().toString().slice(-4)}`;
        profileData = await tx.director.create({
          data: {
            name,
            email: lowerEmail,
            employeeId: empId,
            userId: newUser.id,
          },
        });
      } else if (role === Role.HOD) {
        const empId = employeeId || `HOD-${Date.now().toString().slice(-4)}`;
        profileData = await tx.hod.create({
          data: {
            name,
            email: lowerEmail,
            employeeId: empId,
            department: dept,
            userId: newUser.id,
          },
        });
      } else if (role === Role.FACULTY) {
        const empId = employeeId || `FAC-${Date.now().toString().slice(-4)}`;
        profileData = await tx.faculty.create({
          data: {
            name,
            email: lowerEmail,
            employeeId: empId,
            department: dept,
            designation: designation || "Assistant Professor",
            status: status || "Active",
            experience: experience || 0,
            image: image || null,
            userId: newUser.id,
          },
        });
      } else if (role === Role.STUDENT) {
        const rNum = (rollNumber || rollNo || `STU-${Date.now().toString().slice(-6)}`).trim();
        profileData = await tx.student.create({
          data: {
            name,
            email: lowerEmail,
            rollNumber: rNum,
            department: dept,
            branch: branch || dept,
            year: year || 1,
            section: section || null,
            session: session || null,
            course: course || dept,
            status: status || "Active",
            image: image || null,
            userId: newUser.id,
          },
        });
      }

      const { password: _, ...userWithoutPassword } = newUser;
      return { user: userWithoutPassword, profile: profileData };
    });

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: result,
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const roleQuery = typeof req.query.role === "string" ? req.query.role : undefined;
    const searchQuery = typeof req.query.search === "string" ? req.query.search : undefined;

    const whereClause: any = {};

    if (roleQuery && ["DIRECTOR", "HOD", "FACULTY", "STUDENT"].includes(roleQuery)) {
      whereClause.role = roleQuery as Role;
    }

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        director: true,
        hod: true,
        faculty: true,
        student: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        director: true,
        hod: true,
        faculty: true,
        student: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const requesterRole = req.user?.role;

    const userToDelete = await prisma.user.findUnique({ where: { id: targetId } });
    if (!userToDelete) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (requesterRole === Role.STUDENT) {
      res.status(403).json({ success: false, message: "Students cannot delete users" });
      return;
    }

    if (requesterRole === Role.FACULTY && userToDelete.role !== Role.STUDENT) {
      res.status(403).json({ success: false, message: "Faculty can only delete Student accounts" });
      return;
    }

    if (requesterRole === Role.HOD && (userToDelete.role === Role.DIRECTOR || userToDelete.role === Role.HOD)) {
      res.status(403).json({ success: false, message: "HOD can only delete Faculty or Student accounts" });
      return;
    }

    await prisma.user.delete({ where: { id: targetId } });

    res.status(200).json({ success: true, message: `User ${userToDelete.name} deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
