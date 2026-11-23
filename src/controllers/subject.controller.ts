import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

const createSubjectSchema = z.object({
  code: z.string().min(2, "Subject code required"),
  name: z.string().min(2, "Subject name required"),
  department: z.string().min(1, "Department required"),
  branch: z.string().optional(),
  credits: z.number().int().min(0, "Academic credits must be 0 or higher").max(10),
  year: z.number().int().min(1).max(6),
  semester: z.number().int().min(1).max(12),
  type: z.string().optional(),
  courseName: z.string().optional(),
  status: z.string().optional().default("Active"),
});

const updateSubjectSchema = z.object({
  code: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  department: z.string().min(1).optional(),
  branch: z.string().optional(),
  credits: z.number().int().min(0).max(10).optional(),
  year: z.number().int().min(1).max(6).optional(),
  semester: z.number().int().min(1).max(12).optional(),
  type: z.string().optional(),
  courseName: z.string().optional(),
  status: z.string().optional(),
});

export const createSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createSubjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const existing = await prisma.subject.findUnique({ where: { code: parseResult.data.code } });
    if (existing) {
      res.status(400).json({ success: false, message: `Subject code ${parseResult.data.code} already exists` });
      return;
    }

    const subject = await prisma.subject.create({ data: parseResult.data });
    res.status(201).json({ success: true, message: "Subject created", data: subject });
  } catch (error: any) {
    console.error("Create subject error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const deptQuery = getQueryString(req.query.department);
    const branchQuery = getQueryString(req.query.branch);
    const rawYear = getQueryString(req.query.year);
    const yearQuery = rawYear ? parseInt(rawYear, 10) : undefined;
    const rawSem = getQueryString(req.query.semester);
    const semQuery = rawSem ? parseInt(rawSem, 10) : undefined;
    const searchQuery = getQueryString(req.query.search);
    const statusQuery = getQueryString(req.query.status);

    const andConditions: any[] = [];

    // Branch filter (match branch or department)
    if (branchQuery && branchQuery !== "All Branches") {
      andConditions.push({
        OR: [
          { branch: branchQuery },
          { department: branchQuery },
        ],
      });
    }

    // Department filter (if specifically requested and not "All Departments")
    if (deptQuery && deptQuery !== "All Departments" && !branchQuery) {
      andConditions.push({
        OR: [
          { department: deptQuery },
          { branch: deptQuery },
        ],
      });
    }

    // Semester filter
    if (semQuery && !isNaN(semQuery)) {
      andConditions.push({ semester: semQuery });
    }

    // Year filter
    if (yearQuery && !isNaN(yearQuery)) {
      andConditions.push({ year: yearQuery });
    }

    // Status filter
    if (statusQuery && statusQuery !== "All") {
      andConditions.push({ status: statusQuery });
    }

    // Search query
    if (searchQuery) {
      andConditions.push({
        OR: [
          { code: { contains: searchQuery, mode: "insensitive" } },
          { name: { contains: searchQuery, mode: "insensitive" } },
          { department: { contains: searchQuery, mode: "insensitive" } },
          { branch: { contains: searchQuery, mode: "insensitive" } },
          { teachingDepartment: { contains: searchQuery, mode: "insensitive" } },
        ],
      });
    }

    const whereClause: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      orderBy: [{ year: "asc" }, { semester: "asc" }, { code: "asc" }],
    });

    res.status(200).json({ success: true, count: subjects.length, subjects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getSubjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Subject ID is required" });
      return;
    }

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        studentSubjects: { include: { student: true } },
        assignments: true,
        results: { include: { student: true } },
      },
    });
    if (!subject) {
      res.status(404).json({ success: false, message: "Subject not found" });
      return;
    }
    res.status(200).json({ success: true, data: subject });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const updateSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Subject ID is required" });
      return;
    }

    const parseResult = updateSubjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Subject not found" });
      return;
    }

    // If code changed, check uniqueness
    if (parseResult.data.code && parseResult.data.code !== existing.code) {
      const codeConflict = await prisma.subject.findUnique({ where: { code: parseResult.data.code } });
      if (codeConflict) {
        res.status(400).json({ success: false, message: `Subject code ${parseResult.data.code} already exists` });
        return;
      }
    }

    const updated = await prisma.subject.update({ where: { id }, data: parseResult.data });
    res.status(200).json({ success: true, message: "Subject updated", data: updated });
  } catch (error: any) {
    console.error("Update subject error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Subject ID is required" });
      return;
    }

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      res.status(404).json({ success: false, message: "Subject not found" });
      return;
    }
    await prisma.subject.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Subject deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
