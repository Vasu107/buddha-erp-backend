import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";

const upsertResultSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  internal: z.number().int().min(0).max(30),
  external: z.number().int().min(0).max(70),
});

const gradeFromTotal = (total: number): { grade: string; points: number } => {
  if (total >= 90) return { grade: "O", points: 10 };
  if (total >= 80) return { grade: "A+", points: 9 };
  if (total >= 70) return { grade: "A", points: 8 };
  if (total >= 60) return { grade: "B+", points: 7 };
  if (total >= 50) return { grade: "B", points: 6 };
  if (total >= 40) return { grade: "C", points: 5 };
  return { grade: "F", points: 0 };
};

export const upsertResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = upsertResultSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const { studentId, subjectId, internal, external } = parseResult.data;
    const total = internal + external;
    const { grade, points } = gradeFromTotal(total);

    // Check existing result for upsert
    const existing = await prisma.result.findFirst({ where: { studentId, subjectId } });

    let result;
    if (existing) {
      result = await prisma.result.update({
        where: { id: existing.id },
        data: { internal, external, total, grade, points },
      });
    } else {
      result = await prisma.result.create({
        data: { studentId, subjectId, internal, external, total, grade, points },
      });
    }

    res.status(200).json({ success: true, message: "Result saved", data: result });
  } catch (error: any) {
    console.error("Upsert result error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const subjectIdQuery = typeof req.query.subjectId === "string" ? req.query.subjectId : undefined;
    const studentIdQuery = typeof req.query.studentId === "string" ? req.query.studentId : undefined;

    const whereClause: any = {};
    if (subjectIdQuery) whereClause.subjectId = subjectIdQuery;

    // Role-based scoping
    if (req.user?.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { userId: req.user.userId } });
      if (student) whereClause.studentId = student.id;
    } else if (studentIdQuery) {
      whereClause.studentId = studentIdQuery;
    }

    const results = await prisma.result.findMany({
      where: whereClause,
      include: {
        student: { select: { name: true, rollNumber: true, department: true } },
        subject: { select: { code: true, name: true, credits: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, count: results.length, results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getRankSheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const deptQuery = typeof req.query.department === "string" ? req.query.department : undefined;
    const yearQuery = req.query.year ? parseInt(req.query.year as string) : undefined;

    const students = await prisma.student.findMany({
      where: {
        ...(deptQuery ? { department: deptQuery } : {}),
        ...(yearQuery ? { year: yearQuery } : {}),
      },
      include: {
        results: {
          include: { subject: { select: { code: true, name: true, credits: true } } },
        },
      },
    });

    // Calculate CGPA for each student
    const rankData = students.map((s) => {
      const results = s.results;
      if (results.length === 0) return { ...s, cgpa: 0, totalCredits: 0, earnedPoints: 0 };

      let totalCredits = 0;
      let earnedPoints = 0;
      for (const r of results) {
        const credits = r.subject.credits;
        totalCredits += credits;
        earnedPoints += r.points * credits;
      }

      const cgpa = totalCredits > 0 ? parseFloat((earnedPoints / totalCredits).toFixed(2)) : 0;
      return { ...s, cgpa, totalCredits, earnedPoints };
    });

    // Sort by CGPA descending and assign ranks
    const sorted = rankData
      .sort((a, b) => b.cgpa - a.cgpa)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    res.status(200).json({ success: true, count: sorted.length, rankSheet: sorted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
