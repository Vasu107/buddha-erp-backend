import { Router } from "express";
import {
  getDirectorDashboardStats,
  getDirectorProfile,
  updateDirectorProfile,
} from "../controllers/director.controller";
import { createFaculty, getFaculty, updateFaculty, deleteFaculty } from "../controllers/faculty.controller";
import { createStudent, getStudents, updateStudent, deleteStudent } from "../controllers/student.controller";
import { createHOD, getHODs } from "../controllers/hod.controller";
import {
  getDirectorAttendance,
  getDirectorAttendanceSummary,
} from "../controllers/director.attendance.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);
router.use(requireRole([Role.DIRECTOR]));

// Director Dashboard & Stats
router.get("/stats", getDirectorDashboardStats);

// Director Profile
router.get("/profile", getDirectorProfile);
router.put("/profile", updateDirectorProfile);

// Director Faculty Management
router.post("/faculty",      createFaculty);
router.get("/faculty",       getFaculty);
router.put("/faculty/:id",   updateFaculty);
router.delete("/faculty/:id",deleteFaculty);

// Director Student Management
router.post("/students",      createStudent);
router.get("/students",       getStudents);
router.put("/students/:id",   updateStudent);
router.delete("/students/:id",deleteStudent);

// Director HOD Management
router.post("/hods", createHOD);
router.get("/hods",  getHODs);

// Director Attendance — view all submitted attendance with rich filters
// GET /api/roles/director/attendance?branch=CSE&department=...&date=2026-10-05&timeSlot=09:00-10:00&section=A&year=2
router.get("/attendance",         getDirectorAttendance);
// GET /api/roles/director/attendance/summary — aggregated per-student stats with at-risk flag
router.get("/attendance/summary", getDirectorAttendanceSummary);

export default router;

