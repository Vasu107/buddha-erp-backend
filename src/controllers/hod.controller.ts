import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

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
