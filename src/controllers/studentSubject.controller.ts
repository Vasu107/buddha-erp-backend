import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

const optSubjectsSchema = z.object({
  studentId: z.string().optional(),
  subjectIds: z.array(z.string()).min(1, "At least one subject must be selected"),
  semester: z.number().int().min(1).max(8),
  session: z.string().min(1, "Session is required (e.g. 2023-2027)"),
  department: z.string().optional(),
  course: z.string().optional().default("B.Tech"),
  academicYear: z.string().optional(),
});

/**
 * Opt / Enroll a student in subjects for a specific semester and session.
 * Used for session-based semester course registrations (e.g. B.Tech 8 semesters, B.Sc 6 semesters).
 */
export const optStudentSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = optSubjectsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parseResult.error.errors,
      });
      return;
    }

    const { subjectIds, semester, session, department, course, academicYear } = parseResult.data;

    // Resolve target student ID: from route param :id, request body, or authenticated user
    const rawParamId = req.params.id;
    const paramId = typeof rawParamId === "string" ? rawParamId : Array.isArray(rawParamId) ? rawParamId[0] : undefined;
    const studentId =
      paramId ||
      parseResult.data.studentId ||
      (req.user?.role === "STUDENT"
        ? (await prisma.student.findFirst({ where: { userId: req.user.userId } }))?.id
        : undefined);

    if (!studentId) {
      res.status(400).json({ success: false, message: "Student ID could not be identified" });
      return;
    }

    // Verify student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({ success: false, message: "Student record not found" });
      return;
    }

    const dept = department || student.department;
    const crs = course || student.course || "B.Tech";
    const sess = session || student.session || "2023-2027";

    // Upsert opted subjects for this semester & session
    const optedRecords = [];
    for (const subjectId of subjectIds) {
      const existing = await prisma.studentSubject.findFirst({
        where: {
          studentId,
          subjectId,
          semester,
          session: sess,
        },
      });

      if (existing) {
        const updated = await prisma.studentSubject.update({
          where: { id: existing.id },
          data: {
            isOpted: true,
            status: "Enrolled",
            department: dept,
            course: crs,
            academicYear: academicYear || undefined,
          },
        });
        optedRecords.push(updated);
      } else {
        const created = await prisma.studentSubject.create({
          data: {
            studentId,
            subjectId,
            semester,
            session: sess,
            department: dept,
            course: crs,
            academicYear: academicYear || undefined,
            isOpted: true,
            status: "Enrolled",
          },
        });
        optedRecords.push(created);
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully opted ${optedRecords.length} subjects for Semester ${semester} (${sess})`,
      count: optedRecords.length,
      data: optedRecords,
    });
  } catch (error: any) {
    console.error("Opt student subjects error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * Get all opted subjects for a student, optionally filtered by semester and session.
 */
export const getStudentOptedSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawParamId = req.params.id;
    const studentIdParam = typeof rawParamId === "string" ? rawParamId : Array.isArray(rawParamId) ? rawParamId[0] : undefined;
    let studentId: string | undefined = studentIdParam;

    if (!studentId && req.user?.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { userId: req.user.userId } });
      studentId = student?.id;
    }

    if (!studentId) {
      res.status(400).json({ success: false, message: "Student ID is required" });
      return;
    }

    const rawSem = getQueryString(req.query.semester);
    const semester = rawSem ? parseInt(rawSem, 10) : undefined;
    const session = getQueryString(req.query.session);

    const whereClause: any = { studentId };
    if (semester && !isNaN(semester)) whereClause.semester = semester;
    if (session) whereClause.session = session;

    const opted = await prisma.studentSubject.findMany({
      where: whereClause,
      include: {
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            semester: true,
            department: true,
            type: true,
          },
        },
      },
      orderBy: [{ semester: "asc" }, { createdAt: "asc" }],
    });

    res.status(200).json({
      success: true,
      studentId,
      count: opted.length,
      optedSubjects: opted,
    });
  } catch (error: any) {
    console.error("Get student opted subjects error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
