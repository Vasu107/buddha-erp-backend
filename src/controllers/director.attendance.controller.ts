import { Request, Response } from "express";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

/**
 * Director — view all submitted attendance records
 * with rich filtering: branch, department, date, timeSlot, section, year, subjectId
 *
 * GET /api/roles/director/attendance
 * Query params:
 *   branch      — e.g. "CSE"
 *   department  — e.g. "Computer Science & Engineering (CSE)"
 *   date        — "2026-10-05"
 *   fromDate    — "2026-10-01"
 *   toDate      — "2026-10-31"
 *   timeSlot    — "09:00-10:00"
 *   section     — "A"
 *   year        — "2"
 *   subjectId   — UUID
 *   facultyId   — UUID
 *   status      — "PRESENT" | "ABSENT" | "LATE"
 *   isSubmitted — "true" | "false"  (default: "true")
 *   page        — page number (default 1)
 *   limit       — records per page (default 100)
 */
export const getDirectorAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const branchQ      = getQueryString(req.query.branch);
    const departmentQ  = getQueryString(req.query.department);
    const dateQ        = getQueryString(req.query.date);
    const fromDateQ    = getQueryString(req.query.fromDate);
    const toDateQ      = getQueryString(req.query.toDate);
    const timeSlotQ    = getQueryString(req.query.timeSlot);
    const sectionQ     = getQueryString(req.query.section);
    const yearQ        = getQueryString(req.query.year);
    const subjectIdQ   = getQueryString(req.query.subjectId);
    const facultyIdQ   = getQueryString(req.query.facultyId);
    const statusQ      = getQueryString(req.query.status);
    const isSubmittedQ = getQueryString(req.query.isSubmitted);
    const pageQ        = getQueryString(req.query.page);
    const limitQ       = getQueryString(req.query.limit);

    const page  = Math.max(1, parseInt(pageQ  || "1",   10));
    const limit = Math.min(500, parseInt(limitQ || "100", 10));
    const skip  = (page - 1) * limit;

    const whereClause: any = {};

    // Default: show only submitted attendance unless caller asks otherwise
    if (isSubmittedQ !== undefined) {
      whereClause.isSubmitted = isSubmittedQ === "true";
    } else {
      whereClause.isSubmitted = true;
    }

    // Date filters
    if (dateQ) {
      const d = new Date(dateQ);
      d.setHours(0, 0, 0, 0);
      whereClause.date = { gte: d, lt: new Date(d.getTime() + 86400000) };
    } else if (fromDateQ || toDateQ) {
      whereClause.date = {};
      if (fromDateQ) whereClause.date.gte = new Date(fromDateQ);
      if (toDateQ)   whereClause.date.lte = new Date(toDateQ);
    }

    if (branchQ)     whereClause.branch     = branchQ;
    if (departmentQ) whereClause.department = departmentQ;
    if (timeSlotQ)   whereClause.timeSlot   = timeSlotQ;
    if (sectionQ)    whereClause.section    = sectionQ;
    if (subjectIdQ)  whereClause.subjectId  = subjectIdQ;
    if (facultyIdQ)  whereClause.facultyId  = facultyIdQ;
    if (statusQ && ["PRESENT", "ABSENT"].includes(statusQ))
      whereClause.status = statusQ;

    // Year filter — needs join to student
    if (yearQ && yearQ !== "All Years") {
      whereClause.student = { year: parseInt(yearQ, 10) };
    }

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where: whereClause }),
      prisma.attendance.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          student: {
            select: {
              id: true, name: true, rollNumber: true, email: true,
              department: true, branch: true, year: true, section: true, session: true,
            },
          },
          subject: { select: { id: true, code: true, name: true } },
          faculty: { select: { id: true, name: true, employeeId: true, department: true } },
        },
        orderBy: [{ date: "desc" }, { branch: "asc" }, { timeSlot: "asc" }],
      }),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      count: records.length,
      attendance: records,
    });
  } catch (error: any) {
    console.error("getDirectorAttendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/**
 * Director — attendance summary (aggregated stats)
 * GET /api/roles/director/attendance/summary
 * Groups by branch+department+section+year and returns present/absent/late counts and %
 *
 * Query: same filters as above (branch, department, date, fromDate, toDate, timeSlot, section, year)
 */
export const getDirectorAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const branchQ     = getQueryString(req.query.branch);
    const departmentQ = getQueryString(req.query.department);
    const dateQ       = getQueryString(req.query.date);
    const fromDateQ   = getQueryString(req.query.fromDate);
    const toDateQ     = getQueryString(req.query.toDate);
    const timeSlotQ   = getQueryString(req.query.timeSlot);
    const sectionQ    = getQueryString(req.query.section);
    const yearQ       = getQueryString(req.query.year);
    const subjectIdQ  = getQueryString(req.query.subjectId);

    const whereClause: any = { isSubmitted: true };

    if (dateQ) {
      const d = new Date(dateQ);
      d.setHours(0, 0, 0, 0);
      whereClause.date = { gte: d, lt: new Date(d.getTime() + 86400000) };
    } else if (fromDateQ || toDateQ) {
      whereClause.date = {};
      if (fromDateQ) whereClause.date.gte = new Date(fromDateQ);
      if (toDateQ)   whereClause.date.lte = new Date(toDateQ);
    }

    if (branchQ)     whereClause.branch     = branchQ;
    if (departmentQ) whereClause.department = departmentQ;
    if (timeSlotQ)   whereClause.timeSlot   = timeSlotQ;
    if (sectionQ)    whereClause.section    = sectionQ;
    if (subjectIdQ)  whereClause.subjectId  = subjectIdQ;
    if (yearQ && yearQ !== "All Years") {
      whereClause.student = { year: parseInt(yearQ, 10) };
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      select: {
        studentId: true,
        status: true,
        branch: true,
        department: true,
        section: true,
        date: true,
        timeSlot: true,
        student: { select: { name: true, rollNumber: true, year: true } },
        subject:  { select: { id: true, code: true, name: true } },
        faculty:  { select: { id: true, name: true } },
      },
    });

    // Per-student summary
    const studentMap = new Map<string, {
      name: string; rollNumber: string; year: number;
      branch: string | null; department: string | null; section: string | null;
      total: number; present: number; absent: number;
    }>();

    for (const r of records) {
      if (!studentMap.has(r.studentId)) {
        studentMap.set(r.studentId, {
          name:       r.student.name,
          rollNumber: r.student.rollNumber,
          year:       r.student.year,
          branch:     r.branch,
          department: r.department,
          section:    r.section,
          total: 0, present: 0, absent: 0,
        });
      }
      const entry = studentMap.get(r.studentId)!;
      entry.total++;
      if (r.status === "PRESENT") entry.present++;
      else if (r.status === "ABSENT") entry.absent++;
    }

    const summary = Array.from(studentMap.entries()).map(([studentId, data]) => ({
      studentId,
      ...data,
      attendancePercent: data.total > 0
        ? parseFloat(((data.present) / data.total * 100).toFixed(2))
        : 0,
      isAtRisk: data.total > 0 && ((data.present) / data.total * 100) < 75,
    })).sort((a, b) => {
      const deptCmp = (a.department || "").localeCompare(b.department || "");
      if (deptCmp !== 0) return deptCmp;
      return a.rollNumber.localeCompare(b.rollNumber);
    });

    // High-level totals
    const totals = {
      totalRecords: records.length,
      totalPresent: records.filter((r) => r.status === "PRESENT").length,
      totalAbsent:  records.filter((r) => r.status === "ABSENT").length,
      studentsAtRisk: summary.filter((s) => s.isAtRisk).length,
    };

    res.status(200).json({
      success: true,
      filters: { branchQ, departmentQ, dateQ, fromDateQ, toDateQ, timeSlotQ, sectionQ, yearQ, subjectIdQ },
      totals,
      count: summary.length,
      summary,
    });
  } catch (error: any) {
    console.error("getDirectorAttendanceSummary error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
