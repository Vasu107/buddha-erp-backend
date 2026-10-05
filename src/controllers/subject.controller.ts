import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

const createSubjectSchema = z.object({
  code: z.string().min(2, "Subject code required"),
  name: z.string().min(2, "Subject name required"),
  department: z.string().min(1, "Department required"),
  credits: z.number().int().min(1).max(6),
  year: z.number().int().min(1).max(4),
  semester: z.number().int().min(1).max(8),
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
    const rawYear = getQueryString(req.query.year);
    const yearQuery = rawYear ? parseInt(rawYear, 10) : undefined;
    const rawSem = getQueryString(req.query.semester);
    const semQuery = rawSem ? parseInt(rawSem, 10) : undefined;

    const whereClause: any = {};
    if (deptQuery) whereClause.department = deptQuery;
    if (yearQuery && !isNaN(yearQuery)) whereClause.year = yearQuery;
    if (semQuery && !isNaN(semQuery)) whereClause.semester = semQuery;

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
