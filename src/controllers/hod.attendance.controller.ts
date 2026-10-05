import { Request, Response } from "express";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

async function resolveHod(userId: string) {
  return prisma.hod.findFirst({ where: { userId } });
}

/* =========================================================
   1. GET HOD ATTENDANCE (scoped to HOD's department)
   GET /api/roles/hod/attendance
   Query: ?branch= &section= &year= &date= &status= &search=
   ========================================================= */
export const getHodAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const hod = await resolveHod(req.user!.userId);
    if (!hod) {
      res.status(404).json({ success: false, message: "HOD profile not found" });
      return;
    }

    const branchQ  = getQueryString(req.query.branch);
    const sectionQ = getQueryString(req.query.section);
    const yearQ    = getQueryString(req.query.year);
    const dateQ    = getQueryString(req.query.date);
    const statusQ  = getQueryString(req.query.status);
    const searchQ  = getQueryString(req.query.search);

    const whereClause: any = {
      OR: [
        { department: hod.department },
        { student: { department: hod.department } },
      ],
    };

    if (branchQ && branchQ !== "all")  whereClause.branch = branchQ;
    if (sectionQ && sectionQ !== "all") whereClause.section = sectionQ;
    if (yearQ && yearQ !== "all") {
      whereClause.student = { ...whereClause.student, year: parseInt(yearQ, 10) };
    }
    if (dateQ) {
      const d = new Date(dateQ);
      d.setHours(0, 0, 0, 0);
      whereClause.date = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }
    if (statusQ && ["PRESENT", "ABSENT"].includes(statusQ)) {
      whereClause.status = statusQ;
    }
    if (searchQ) {
      whereClause.student = {
        ...whereClause.student,
        OR: [
          { name: { contains: searchQ, mode: "insensitive" } },
          { rollNumber: { contains: searchQ, mode: "insensitive" } },
        ],
      };
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, rollNumber: true, email: true, year: true, section: true, department: true },
        },
        subject: { select: { id: true, code: true, name: true } },
        faculty: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    res.status(200).json({
      success: true,
      department: hod.department,
      count: attendance.length,
      attendance,
    });
  } catch (error: any) {
    console.error("getHodAttendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* =========================================================
   2. HOD ATTENDANCE SUMMARY (per student stats in department)
   GET /api/roles/hod/attendance/summary
   ========================================================= */
export const getHodAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const hod = await resolveHod(req.user!.userId);
    if (!hod) {
      res.status(404).json({ success: false, message: "HOD profile not found" });
      return;
    }

    const sectionQ = getQueryString(req.query.section);
    const yearQ    = getQueryString(req.query.year);
    const statusQ  = getQueryString(req.query.status);
    const searchQ  = getQueryString(req.query.search);

    // Fetch department students
    const studentWhere: any = { department: hod.department };
    if (yearQ && yearQ !== "all") studentWhere.year = parseInt(yearQ, 10);
    if (sectionQ && sectionQ !== "all") studentWhere.section = sectionQ;
    if (searchQ) {
      studentWhere.OR = [
        { name: { contains: searchQ, mode: "insensitive" } },
        { rollNumber: { contains: searchQ, mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        name: true,
        rollNumber: true,
        year: true,
        section: true,
        department: true,
        branch: true,
      },
      orderBy: [{ year: "asc" }, { rollNumber: "asc" }],
    });

    const studentIds = students.map((s) => s.id);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        isSubmitted: true,
      },
      select: {
        studentId: true,
        status: true,
        subject: { select: { code: true, name: true } },
      },
    });

    const statsMap = new Map<string, { present: number; total: number; subjectMap: Map<string, { present: number; total: number }> }>();
    for (const r of attendanceRecords) {
      if (!statsMap.has(r.studentId)) {
        statsMap.set(r.studentId, { present: 0, total: 0, subjectMap: new Map() });
      }
      const entry = statsMap.get(r.studentId)!;
      entry.total++;
      if (r.status === "PRESENT") entry.present++;

      const subName = r.subject ? `${r.subject.code} - ${r.subject.name}` : "General";
      if (!entry.subjectMap.has(subName)) {
        entry.subjectMap.set(subName, { present: 0, total: 0 });
      }
      const subEntry = entry.subjectMap.get(subName)!;
      subEntry.total++;
      if (r.status === "PRESENT") subEntry.present++;
    }

    const summary = students.map((s) => {
      const stats = statsMap.get(s.id) || { present: 0, total: 0, subjectMap: new Map() };
      const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100;
      
      let status: "Good" | "Warning" | "Critical" = "Good";
      if (percentage < 60) status = "Critical";
      else if (percentage < 75) status = "Warning";

      const primarySubject = stats.subjectMap.size > 0 
        ? Array.from(stats.subjectMap.keys())[0] 
        : `${hod.department} Core`;

      return {
        id: s.id,
        name: s.name,
        rollNumber: s.rollNumber,
        year: s.year,
        section: s.section || "A",
        department: s.department,
        subject: primarySubject,
        present: stats.present,
        total: stats.total || 40, // default placeholder total if unrecorded
        percentage,
        status,
      };
    });

    const filteredSummary = summary.filter((s) => {
      if (statusQ && statusQ !== "all") {
        return s.status === statusQ;
      }
      return true;
    });

    const criticalCount = summary.filter((s) => s.status === "Critical").length;
    const warningCount  = summary.filter((s) => s.status === "Warning").length;

    res.status(200).json({
      success: true,
      department: hod.department,
      criticalCount,
      warningCount,
      count: filteredSummary.length,
      summary: filteredSummary,
    });
  } catch (error: any) {
    console.error("getHodAttendanceSummary error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
