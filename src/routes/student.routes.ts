import { Router } from "express";
import { createStudent, getStudents, updateStudent, deleteStudent, bulkCreateStudents } from "../controllers/student.controller";
import { getStudentAttendance, getStudentAttendanceSummary } from "../controllers/student.attendance.controller";
import { optStudentSubjects, getStudentOptedSubjects } from "../controllers/studentSubject.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// Opted Subject endpoints (session-based & semester-based)
router.get("/:id/subjects", requireRole([Role.STUDENT, Role.FACULTY, Role.HOD, Role.DIRECTOR]), getStudentOptedSubjects);
router.post("/:id/subjects/opt", requireRole([Role.STUDENT, Role.FACULTY, Role.HOD, Role.DIRECTOR]), optStudentSubjects);
router.post("/subjects/opt", requireRole([Role.STUDENT, Role.FACULTY, Role.HOD, Role.DIRECTOR]), optStudentSubjects);

// Student role attendance endpoints
router.get("/attendance", requireRole([Role.STUDENT, Role.FACULTY, Role.HOD, Role.DIRECTOR]), getStudentAttendance);
router.get("/attendance/summary", requireRole([Role.STUDENT, Role.FACULTY, Role.HOD, Role.DIRECTOR]), getStudentAttendanceSummary);

// Director, HOD, and Faculty can manage students
router.post("/bulk", requireRole([Role.DIRECTOR, Role.HOD]), bulkCreateStudents);
router.post("/", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), createStudent);
router.get("/", getStudents);
router.put("/:id", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), updateStudent);
router.delete("/:id", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), deleteStudent);

export default router;
