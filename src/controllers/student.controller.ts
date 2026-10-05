import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

const createStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional().default("student123"),
  rollNumber: z.string().optional(),
  rollNo: z.string().optional(),
  department: z.string().optional(),
  branch: z.string().optional(),
  year: z.number().int().min(1).max(6).optional().default(1),
  section: z.string().optional(),
  session: z.string().optional(),
  course: z.string().optional(),
  image: z.string().optional(),
  status: z.string().optional().default("Active"),
});

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createStudentSchema.safeParse(req.body);
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
      rollNumber,
      rollNo,
      department,
      branch,
      year,
      section,
      session,
      course,
      image,
      status,
    } = parseResult.data;

    const rNo = (rollNumber || rollNo || `BIT${Date.now().toString().slice(-6)}`).trim();
    const dept = (branch || department || "CSE").trim();
    const lowerEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email: lowerEmail } });
    if (existingUser) {
      res.status(400).json({ success: false, message: `Email ${email} is already in use` });
      return;
    }

    const existingStudent = await prisma.student.findUnique({ where: { rollNumber: rNo } });
    if (existingStudent) {
      res.status(400).json({ success: false, message: `Roll Number ${rNo} already exists` });
      return;
    }

    const hashedPassword = await bcrypt.hash(password || "student123", 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: lowerEmail,
          password: hashedPassword,
          role: Role.STUDENT,
        },
      });

      const student = await tx.student.create({
        data: {
          name,
          email: lowerEmail,
          rollNumber: rNo,
          department: dept,
          branch: branch || dept,
          year,
          section: section || null,
          session: session || null,
          course: course || dept,
          image: image || null,
          status: status || "Active",
          userId: user.id,
        },
      });

      const { password: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, student };
    });

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Create student error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const deptQuery = typeof req.query.department === "string" ? req.query.department : undefined;
    const branchQuery = typeof req.query.branch === "string" ? req.query.branch : undefined;
    const yearQuery = typeof req.query.year === "string" ? req.query.year : undefined;
    const sectionQuery = typeof req.query.section === "string" ? req.query.section : undefined;
    const sessionQuery = typeof req.query.session === "string" ? req.query.session : undefined;
    const searchQuery = typeof req.query.search === "string" ? req.query.search : undefined;

    const whereClause: any = {};

    const targetDept = branchQuery || deptQuery;
    if (targetDept && targetDept !== "All Courses" && targetDept !== "All Departments") {
      whereClause.OR = [{ department: targetDept }, { branch: targetDept }, { course: targetDept }];
    }

    if (yearQuery && yearQuery !== "All Years") {
      whereClause.year = parseInt(yearQuery, 10);
    }

    if (sectionQuery && sectionQuery !== "all") {
      whereClause.section = sectionQuery;
    }

    if (sessionQuery) {
      whereClause.session = sessionQuery;
    }

    if (searchQuery) {
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { email: { contains: searchQuery, mode: "insensitive" } },
          { rollNumber: { contains: searchQuery, mode: "insensitive" } },
        ],
      });
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, email: true, role: true, createdAt: true },
        },
      },
      orderBy: { rollNumber: "asc" },
    });

    res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const existingStudent = await prisma.student.findUnique({ where: { id } });
    if (!existingStudent) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const { name, email, rollNumber, branch, department, year, section, session, course, status, image } = req.body;

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email: email.toLowerCase() }),
        ...(rollNumber && { rollNumber }),
        ...((branch || department) && { branch: branch || department, department: department || branch }),
        ...(year && { year: Number(year) }),
        ...(section !== undefined && { section }),
        ...(session !== undefined && { session }),
        ...(course !== undefined && { course }),
        ...(status !== undefined && { status }),
        ...(image !== undefined && { image }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student: updatedStudent,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const student = await prisma.student.findUnique({ where: { id } });

    if (!student) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    if (student.userId) {
      await prisma.user.delete({ where: { id: student.userId } });
    } else {
      await prisma.student.delete({ where: { id } });
    }

    res.status(200).json({ success: true, message: "Student deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
