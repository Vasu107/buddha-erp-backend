import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, requireRole } from "../middleware/auth";

// Faculty attendance controller
import {
  getMyStudents,
  markSingleAttendance,
  bulkMarkAttendance,
  submitAttendance,
  getFacultyAttendance,
  getAttendanceSummary,
} from "../controllers/faculty.attendance.controller";

// Re-use existing student controller for student CRUD by faculty
import { getStudents } from "../controllers/student.controller";

const router = Router();

// All routes require authentication + FACULTY (or HOD) role
router.use(authenticateToken);
router.use(requireRole([Role.FACULTY, Role.HOD]));

/* ----------------------------------------------------------
   Students accessible to this faculty member
   GET  /api/roles/faculty/students          — students in faculty dept (filterable)
   ---------------------------------------------------------- */
router.get("/students",          getMyStudents);
router.get("/students/all",      getStudents);   // unscoped list (same as /api/students)

/* ----------------------------------------------------------
   Attendance — mark, bulk-mark, submit, view, summary
   ---------------------------------------------------------- */
router.get("/attendance",          getFacultyAttendance);    // GET  /api/roles/faculty/attendance
router.get("/attendance/summary",  getAttendanceSummary);    // GET  /api/roles/faculty/attendance/summary
router.post("/attendance",         markSingleAttendance);    // POST /api/roles/faculty/attendance
router.post("/attendance/bulk",    bulkMarkAttendance);      // POST /api/roles/faculty/attendance/bulk
router.post("/attendance/submit",  submitAttendance);        // POST /api/roles/faculty/attendance/submit

export default router;
