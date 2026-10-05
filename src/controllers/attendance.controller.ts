import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";

const markAttendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().min(1, "Date required"), // ISO string
  status: z.enum(["PRESENT", "ABSENT"]),
});

const bulkAttendanceSchema = z.object({
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["PRESENT", "ABSENT"]),
    })
  ),
  date: z.string(),
});

export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = markAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const { studentId, date, status } = parseResult.data;

    // Check student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        date: new Date(date),
        status,
      },
    });

    res.status(201).json({ success: true, message: "Attendance marked", data: attendance });
  } catch (error: any) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const bulkMarkAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = bulkAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const { records, date } = parseResult.data;
    const attendanceDate = new Date(date);

    const created = await prisma.$transaction(
      records.map((r) =>
        prisma.attendance.create({
          data: {
            studentId: r.studentId,
            date: attendanceDate,
            status: r.status,
          },
        })
      )
    );

    res.status(201).json({ success: true, message: `${created.length} attendance records saved`, count: created.length });
  } catch (error: any) {
    console.error("Bulk attendance error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentIdQuery = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
    const dateQuery = typeof req.query.date === "string" ? req.query.date : undefined;

    const whereClause: any = {};
    if (studentIdQuery) whereClause.studentId = studentIdQuery;
    if (dateQuery) {
      const d = new Date(dateQuery);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      whereClause.date = { gte: d, lt: nextD };
    }

    // Role-based: if STUDENT, only see their own
    if (req.user?.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { userId: req.user.userId } });
      if (student) whereClause.studentId = student.id;
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: { select: { name: true, rollNumber: true, department: true } },
      },
      orderBy: { date: "desc" },
    });

    res.status(200).json({ success: true, count: attendance.length, attendance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
