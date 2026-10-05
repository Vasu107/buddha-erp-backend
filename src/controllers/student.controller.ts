import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

const createStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rollNumber: z.string().min(1, "Roll number is required"),
  department: z.string().min(1, "Department is required"),
  year: z.number().int().min(1).max(4),
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

    const { name, email, password, rollNumber, department, year } = parseResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      res.status(400).json({ success: false, message: `Email ${email} is already in use` });
      return;
    }

    const existingStudent = await prisma.student.findUnique({ where: { rollNumber } });
    if (existingStudent) {
      res.status(400).json({ success: false, message: `Roll Number ${rollNumber} already exists` });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: Role.STUDENT,
        },
      });

      const student = await tx.student.create({
        data: {
          name,
          email: email.toLowerCase(),
          rollNumber,
          department,
          year,
          userId: user.id,
        },
      });

      const { password: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, student };
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully",
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
    const yearQuery = typeof req.query.year === "string" ? req.query.year : undefined;
    const searchQuery = typeof req.query.search === "string" ? req.query.search : undefined;

    const whereClause: any = {};

    if (deptQuery) {
      whereClause.department = deptQuery;
    }

    if (yearQuery) {
      whereClause.year = parseInt(yearQuery, 10);
    }

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { rollNumber: { contains: searchQuery } },
      ];
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
