import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

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
    const dept = (department || branch || "Computer Science & Engineering (CSE)").trim();
    const lowerEmail = email.toLowerCase().trim();

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

    const result = await prisma.$transaction(async (tx) => {
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

export const getFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const deptQuery = typeof req.query.department === "string" ? req.query.department : undefined;
    const desigQuery = typeof req.query.designation === "string" ? req.query.designation : undefined;
    const statusQuery = typeof req.query.status === "string" ? req.query.status : undefined;
    const searchQuery = typeof req.query.search === "string" ? req.query.search : undefined;

    const whereClause: any = {};

    if (deptQuery && deptQuery !== "All Departments") {
      whereClause.department = deptQuery;
    }

    if (desigQuery && desigQuery !== "All Designations") {
      whereClause.designation = desigQuery;
    }

    if (statusQuery && statusQuery !== "All Status") {
      whereClause.status = statusQuery;
    }

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
        { employeeId: { contains: searchQuery, mode: "insensitive" } },
        { department: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

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
    const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const existingFaculty = await prisma.faculty.findUnique({ where: { id } });
    if (!existingFaculty) {
      res.status(404).json({ success: false, message: "Faculty not found" });
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
    const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const faculty = await prisma.faculty.findUnique({ where: { id } });

    if (!faculty) {
      res.status(404).json({ success: false, message: "Faculty member not found" });
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
