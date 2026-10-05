import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { Role } from "@prisma/client";

const createNoticeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(5, "Content is required"),
  role: z.enum(["STUDENT", "FACULTY", "HOD", "DIRECTOR"]),
});

export const createNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createNoticeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const { title, content, role } = parseResult.data;

    const notice = await prisma.notice.create({
      data: { title, content, role: role as Role },
    });

    res.status(201).json({ success: true, message: "Announcement created", data: notice });
  } catch (error: any) {
    console.error("Create notice error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const roleQuery = typeof req.query.role === "string" ? req.query.role : undefined;

    const whereClause: any = {};

    // HOD and Director see all notices; Faculty/Student see their own role's notices
    if (userRole === Role.HOD || userRole === Role.DIRECTOR) {
      if (roleQuery) whereClause.role = roleQuery;
    } else if (userRole === Role.FACULTY) {
      whereClause.role = Role.FACULTY;
    } else if (userRole === Role.STUDENT) {
      whereClause.role = Role.STUDENT;
    }

    const notices = await prisma.notice.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, count: notices.length, notices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      res.status(404).json({ success: false, message: "Notice not found" });
      return;
    }

    await prisma.notice.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Notice deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
