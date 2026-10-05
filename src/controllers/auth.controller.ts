import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "buddha_erp_super_secret_jwt_key_2026_director_hod_faculty";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["DIRECTOR", "HOD", "FACULTY", "STUDENT"]).optional(),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parseResult.error.errors,
      });
      return;
    }

    const { email, password, role } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        director: true,
        hod: true,
        faculty: true,
        student: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    if (role && user.role !== role) {
      res.status(401).json({
        success: false,
        message: `Account found, but role does not match. Expected ${role}, but user is ${user.role}`,
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    let profile = null;
    if (user.role === Role.DIRECTOR) profile = user.director;
    else if (user.role === Role.HOD) profile = user.hod;
    else if (user.role === Role.FACULTY) profile = user.faculty;
    else if (user.role === Role.STUDENT) profile = user.student;

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userWithoutPassword,
      profile,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
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

    const { password: _, ...userWithoutPassword } = user;

    let profile = null;
    if (user.role === Role.DIRECTOR) profile = user.director;
    else if (user.role === Role.HOD) profile = user.hod;
    else if (user.role === Role.FACULTY) profile = user.faculty;
    else if (user.role === Role.STUDENT) profile = user.student;

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      profile,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};
