import { Request, Response } from "express";
import prisma from "../config/prisma";

async function resolveStudent(userId: string) {
  return prisma.student.findFirst({ where: { userId } });
}

/* =========================================================
   1. GET STUDENT ATTENDANCE (logged-in student's records)
   GET /api/roles/student/attendance
   ========================================================= */
export const getStudentAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await resolveStudent(req.user!.userId);
    if (!student) {
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        faculty: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    res.status(200).json({
      success: true,
      student: { id: student.id, name: student.name, rollNumber: student.rollNumber },
      count: records.length,
      attendance: records,
    });
  } catch (error: any) {
    console.error("getStudentAttendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* =========================================================
   2. GET STUDENT ATTENDANCE SUMMARY (subject-wise breakdown)
   GET /api/roles/student/attendance/summary
   ========================================================= */
export const getStudentAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await resolveStudent(req.user!.userId);
    if (!student) {
      res.status(404).json({ success: false, message: "Student profile not found" });
      return;
    }

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id, isSubmitted: true },
      include: {
        subject: { select: { id: true, code: true, name: true } },
      },
    });

    const subjectMap = new Map<string, { code: string; name: string; attended: number; total: number }>();
    let totalAttended = 0;
    let totalClasses = records.length;

    for (const r of records) {
      const code = r.subject?.code || "GEN101";
      const name = r.subject?.name || "General Course";

      if (!subjectMap.has(code)) {
        subjectMap.set(code, { code, name, attended: 0, total: 0 });
      }
      const entry = subjectMap.get(code)!;
      entry.total++;
      if (r.status === "PRESENT") {
        entry.attended++;
        totalAttended++;
      }
    }

    const subjects = Array.from(subjectMap.values()).map((s) => ({
      ...s,
      pct: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 100,
    }));

    const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100;

    res.status(200).json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department,
        year: student.year,
        section: student.section,
      },
      overall: overallPct,
      totalClasses,
      totalAttended,
      subjects,
    });
  } catch (error: any) {
    console.error("getStudentAttendanceSummary error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
