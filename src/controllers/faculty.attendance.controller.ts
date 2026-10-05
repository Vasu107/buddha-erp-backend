import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

/* =========================================================
   SCHEMAS
   ========================================================= */

const singleAttendanceSchema = z.object({
  studentId:  z.string().min(1, "studentId required"),
  subjectId:  z.string().optional(),
  date:       z.string().min(1, "date required"),  // "2026-10-05"
  timeSlot:   z.string().optional(),               // "09:00-10:00"
  status:     z.enum(["PRESENT", "ABSENT"]),
  branch:     z.string().optional(),
  department: z.string().optional(),
  section:    z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  subjectId:  z.string().optional(),
  date:       z.string().min(1, "date required"),
  timeSlot:   z.string().optional(),
  branch:     z.string().optional(),
  department: z.string().optional(),
  section:    z.string().optional(),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(["PRESENT", "ABSENT"]),
    })
  ).min(1, "At least one record required"),
});

const submitAttendanceSchema = z.object({
  date:       z.string().min(1, "date required"),
  subjectId:  z.string().optional(),
  timeSlot:   z.string().optional(),
  branch:     z.string().optional(),
  department: z.string().optional(),
  section:    z.string().optional(),
});

/* =========================================================
   HELPER — resolve faculty profile from JWT userId
   ========================================================= */
async function resolveFaculty(userId: string) {
  return prisma.faculty.findFirst({ where: { userId } });
}

/* =========================================================
   1. GET MY STUDENTS
   Faculty lists students from their department (filterable)
   GET /api/roles/faculty/students
   Query: ?branch= &department= &year= &section= &search=
   ========================================================= */
export const getMyStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculty = await resolveFaculty(req.user!.userId);
    if (!faculty) {
      res.status(404).json({ success: false, message: "Faculty profile not found" });
      return;
    }

    const branchQ  = getQueryString(req.query.branch);
    const deptQ    = getQueryString(req.query.department);
    const yearQ    = getQueryString(req.query.year);
    const sectionQ = getQueryString(req.query.section);
    const searchQ  = getQueryString(req.query.search);

    const targetDept = branchQ || deptQ || faculty.department;
    const whereClause: any = { status: "Active" };

    if (targetDept && targetDept !== "All") {
      whereClause.OR = [
        { department: targetDept },
        { branch:     targetDept },
        { course:     targetDept },
      ];
    }
    if (yearQ && yearQ !== "All Years")   whereClause.year    = parseInt(yearQ, 10);
    if (sectionQ && sectionQ !== "all")   whereClause.section = sectionQ;

    if (searchQ) {
      whereClause.AND = [{
        OR: [
          { name:       { contains: searchQ, mode: "insensitive" } },
          { email:      { contains: searchQ, mode: "insensitive" } },
          { rollNumber: { contains: searchQ, mode: "insensitive" } },
        ],
      }];
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true, name: true, rollNumber: true, email: true,
        department: true, branch: true, year: true,
        section: true, session: true, course: true, image: true, status: true,
      },
      orderBy: [{ year: "asc" }, { rollNumber: "asc" }],
    });

    res.status(200).json({
      success: true,
      faculty: { id: faculty.id, name: faculty.name, department: faculty.department },
      count: students.length,
      students,
    });
  } catch (error: any) {
    console.error("getMyStudents error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* =========================================================
   2. MARK SINGLE ATTENDANCE
   POST /api/roles/faculty/attendance
   ========================================================= */
export const markSingleAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculty = await resolveFaculty(req.user!.userId);
    if (!faculty) {
      res.status(404).json({ success: false, message: "Faculty profile not found" });
      return;
    }

    const parseResult = singleAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const { studentId, subjectId, date, timeSlot, status, branch, department, section } = parseResult.data;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate.getTime() + 86400000);

    // Upsert: update if same student+date+timeSlot+subject already exists
    const existing = await prisma.attendance.findFirst({
      where: {
        studentId,
        date: { gte: attendanceDate, lt: nextDay },
        ...(timeSlot  && { timeSlot }),
        ...(subjectId && { subjectId }),
      },
    });

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data:  { status, facultyId: faculty.id },
      });
      res.status(200).json({ success: true, message: "Attendance updated", data: updated });
      return;
    }

    const record = await prisma.attendance.create({
      data: {
        studentId,
        subjectId:  subjectId  || null,
        facultyId:  faculty.id,
        date:       attendanceDate,
        timeSlot:   timeSlot   || null,
        branch:     branch     || student.branch || student.department,
        department: department || student.department,
        section:    section    || student.section,
        status,
        isSubmitted: false,
      },
    });

    res.status(201).json({ success: true, message: "Attendance marked", data: record });
  } catch (error: any) {
    console.error("markSingleAttendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* =========================================================
   3. BULK MARK ATTENDANCE (whole class in one call)
   POST /api/roles/faculty/attendance/bulk
   Body: { subjectId, date, timeSlot, branch, department, section, records: [{studentId, status}] }
   ========================================================= */
export const bulkMarkAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculty = await resolveFaculty(req.user!.userId);
    if (!faculty) {
      res.status(404).json({ success: false, message: "Faculty profile not found" });
      return;
    }

    const parseResult = bulkAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const { subjectId, date, timeSlot, branch, department, section, records } = parseResult.data;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate.getTime() + 86400000);

    const studentIds = records.map((r) => r.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, branch: true, department: true, section: true },
    });
    const stuMap = new Map(students.map((s) => [s.id, s]));

    // Build upsert-equivalent: delete existing unsubmitted + bulk create fresh
    await prisma.attendance.deleteMany({
      where: {
        studentId:   { in: studentIds },
        date:        { gte: attendanceDate, lt: nextDay },
        isSubmitted: false,
        ...(timeSlot  && { timeSlot }),
        ...(subjectId && { subjectId }),
        facultyId:   faculty.id,
      },
    });

    const createData = records.map((r) => {
      const stu = stuMap.get(r.studentId);
      return {
        studentId:   r.studentId,
        subjectId:   subjectId  || null,
        facultyId:   faculty.id,
        date:        attendanceDate,
        timeSlot:    timeSlot   || null,
        branch:      branch     || stu?.branch || stu?.department || faculty.department,
        department:  department || stu?.department || faculty.department,
        section:     section    || stu?.section || null,
        status:      r.status   as "PRESENT" | "ABSENT",
        isSubmitted: false,
      };
    });

    const { count } = await prisma.attendance.createMany({ data: createData });

    res.status(201).json({
      success: true,
      message: `${count} attendance records saved`,
      count,
    });
  } catch (error: any) {
    console.error("bulkMarkAttendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* =========================================================
   4. SUBMIT ATTENDANCE (lock / finalise a session)
   POST /api/roles/faculty/attendance/submit
   Body: { date, subjectId?, timeSlot?, branch?, department?, section? }
   ========================================================= */
export const submitAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculty = await resolveFaculty(req.user!.userId);
    if (!faculty) {
      res.status(404).json({ success: false, message: "Faculty profile not found" });
      return;
    }

    const parseResult = submitAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const { date, subjectId, timeSlot, branch, department, section } = parseResult.data;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate.getTime() + 86400000);

    const whereClause: any = {
      facultyId:   faculty.id,
      date:        { gte: attendanceDate, lt: nextDay },
      isSubmitted: false,
    };
    if (subjectId)  whereClause.subjectId  = subjectId;
    if (timeSlot)   whereClause.timeSlot   = timeSlot;
    if (branch)     whereClause.branch     = branch;
    if (department) whereClause.department = department;
    if (section)    whereClause.section    = section;

    const submittedAt = new Date();
    const { count } = await prisma.attendance.updateMany({
      where: whereClause,
      data:  { isSubmitted: true, submittedAt },
    });

    if (count === 0) {
      res.status(404).json({
        success: false,
        message: "No unsubmitted attendance records found for the given filters",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Attendance submitted — ${count} records locked`,
      submittedCount: count,
      submittedAt,
    });
  } catch (error: any) {
    console.error("submitAttendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* =========================================================
   5. GET FACULTY ATTENDANCE (what this faculty has marked)
   GET /api/roles/faculty/attendance
   Query: ?date= &subjectId= &timeSlot= &studentId= &branch= &section= &isSubmitted=
   ========================================================= */
export const getFacultyAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculty = await resolveFaculty(req.user!.userId);
    if (!faculty) {
      res.status(404).json({ success: false, message: "Faculty profile not found" });
      return;
    }

    const dateQ        = getQueryString(req.query.date);
    const subjectIdQ   = getQueryString(req.query.subjectId);
    const timeSlotQ    = getQueryString(req.query.timeSlot);
    const studentIdQ   = getQueryString(req.query.studentId);
    const isSubmittedQ = getQueryString(req.query.isSubmitted);
    const branchQ      = getQueryString(req.query.branch);
    const sectionQ     = getQueryString(req.query.section);

    const whereClause: any = { facultyId: faculty.id };

    if (dateQ) {
      const d = new Date(dateQ);
      d.setHours(0, 0, 0, 0);
      whereClause.date = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }
    if (subjectIdQ)   whereClause.subjectId  = subjectIdQ;
    if (timeSlotQ)    whereClause.timeSlot   = timeSlotQ;
    if (studentIdQ)   whereClause.studentId  = studentIdQ;
    if (branchQ)      whereClause.branch     = branchQ;
    if (sectionQ)     whereClause.section    = sectionQ;
    if (isSubmittedQ !== undefined) whereClause.isSubmitted = isSubmittedQ === "true";

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, rollNumber: true, email: true, department: true, branch: true, section: true, year: true },
        },
        subject: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { timeSlot: "asc" }],
    });

    res.status(200).json({
      success: true,
      faculty: { id: faculty.id, name: faculty.name },
      count: records.length,
      attendance: records,
    });
  } catch (error: any) {
    console.error("getFacultyAttendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/* =========================================================
   6. ATTENDANCE SUMMARY per student (Faculty view)
   GET /api/roles/faculty/attendance/summary
   Query: ?subjectId= &branch= &section= &fromDate= &toDate=
   ========================================================= */
export const getAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculty = await resolveFaculty(req.user!.userId);
    if (!faculty) {
      res.status(404).json({ success: false, message: "Faculty profile not found" });
      return;
    }

    const subjectIdQ = getQueryString(req.query.subjectId);
    const branchQ    = getQueryString(req.query.branch);
    const sectionQ   = getQueryString(req.query.section);
    const fromDateQ  = getQueryString(req.query.fromDate);
    const toDateQ    = getQueryString(req.query.toDate);

    const whereClause: any = { facultyId: faculty.id, isSubmitted: true };
    if (subjectIdQ) whereClause.subjectId = subjectIdQ;
    if (branchQ)    whereClause.branch    = branchQ;
    if (sectionQ)   whereClause.section   = sectionQ;
    if (fromDateQ || toDateQ) {
      whereClause.date = {};
      if (fromDateQ) whereClause.date.gte = new Date(fromDateQ);
      if (toDateQ)   whereClause.date.lte = new Date(toDateQ);
    }

    const records = await prisma.attendance.findMany({
      where: whereClause,
      select: {
        studentId: true,
        status: true,
        student: { select: { name: true, rollNumber: true } },
      },
    });

    const summaryMap = new Map<string, { name: string; rollNumber: string; total: number; present: number; absent: number }>();
    for (const r of records) {
      if (!summaryMap.has(r.studentId)) {
        summaryMap.set(r.studentId, { name: r.student.name, rollNumber: r.student.rollNumber, total: 0, present: 0, absent: 0 });
      }
      const entry = summaryMap.get(r.studentId)!;
      entry.total++;
      if (r.status === "PRESENT") entry.present++;
      else if (r.status === "ABSENT") entry.absent++;
    }

    const summary = Array.from(summaryMap.entries())
      .map(([studentId, data]) => ({
        studentId,
        ...data,
        attendancePercent: data.total > 0
          ? parseFloat(((data.present) / data.total * 100).toFixed(2))
          : 0,
      }))
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

    res.status(200).json({
      success: true,
      faculty: { id: faculty.id, name: faculty.name },
      count: summary.length,
      summary,
    });
  } catch (error: any) {
    console.error("getAttendanceSummary error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
