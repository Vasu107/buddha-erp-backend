import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

const createSyllabusSchema = z.object({
  code: z.string().min(2, "Subject code required"),
  subject: z.string().min(2, "Subject name required"),
  department: z.string().min(1, "Department required"),
  semester: z.number().int().min(1).max(8),
  units: z.number().int().min(1).max(20).optional().default(5),
  totalHours: z.number().int().min(10).max(200).optional().default(45),
  docUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["Active", "Under Review"]).optional().default("Active"),
});

const updateSyllabusSchema = z.object({
  code: z.string().min(2).optional(),
  subject: z.string().min(2).optional(),
  department: z.string().min(1).optional(),
  semester: z.number().int().min(1).max(8).optional(),
  units: z.number().int().min(1).max(20).optional(),
  totalHours: z.number().int().min(10).max(200).optional(),
  docUrl: z.string().url().optional().or(z.literal("")).optional(),
  status: z.enum(["Active", "Under Review"]).optional(),
});

export const getSyllabusList = async (req: Request, res: Response): Promise<void> => {
  try {
    const deptQuery = getQueryString(req.query.department);
    const rawSem = getQueryString(req.query.semester);
    const semQuery = rawSem ? parseInt(rawSem, 10) : undefined;
    const statusQuery = getQueryString(req.query.status);
    const searchQuery = getQueryString(req.query.search);

    const whereClause: any = {};
    if (deptQuery) whereClause.department = deptQuery;
    if (semQuery && !isNaN(semQuery)) whereClause.semester = semQuery;
    if (statusQuery) whereClause.status = statusQuery;
    if (searchQuery) {
      whereClause.OR = [
        { code: { contains: searchQuery, mode: "insensitive" } },
        { subject: { contains: searchQuery, mode: "insensitive" } },
        { department: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const syllabusList = await prisma.syllabus.findMany({
      where: whereClause,
      orderBy: [{ semester: "asc" }, { code: "asc" }],
    });

    res.status(200).json({ success: true, count: syllabusList.length, syllabusList });
  } catch (error: any) {
    console.error("Get syllabus list error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const createSyllabus = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createSyllabusSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const existing = await prisma.syllabus.findUnique({ where: { code: parseResult.data.code } });
    if (existing) {
      res.status(400).json({ success: false, message: `Syllabus with code ${parseResult.data.code} already exists` });
      return;
    }

    const syllabus = await prisma.syllabus.create({ data: parseResult.data });
    res.status(201).json({ success: true, message: "Syllabus created", data: syllabus });
  } catch (error: any) {
    console.error("Create syllabus error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const updateSyllabus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Syllabus ID is required" });
      return;
    }

    const parseResult = updateSyllabusSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const existing = await prisma.syllabus.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Syllabus not found" });
      return;
    }

    // If code changed, check uniqueness
    if (parseResult.data.code && parseResult.data.code !== existing.code) {
      const codeConflict = await prisma.syllabus.findUnique({ where: { code: parseResult.data.code } });
      if (codeConflict) {
        res.status(400).json({ success: false, message: `Syllabus code ${parseResult.data.code} already exists` });
        return;
      }
    }

    const updated = await prisma.syllabus.update({ where: { id }, data: parseResult.data });
    res.status(200).json({ success: true, message: "Syllabus updated", data: updated });
  } catch (error: any) {
    console.error("Update syllabus error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteSyllabus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Syllabus ID is required" });
      return;
    }

    const existing = await prisma.syllabus.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Syllabus not found" });
      return;
    }

    await prisma.syllabus.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Syllabus deleted" });
  } catch (error: any) {
    console.error("Delete syllabus error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

