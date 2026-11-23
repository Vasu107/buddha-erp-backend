import { Router } from "express";
import {
  createHOD,
  getHODs,
  getHodFacultyWorkload,
  getHodDepartmentFaculty,
  getHodFaculty,
} from "../controllers/hod.controller";
import { getHodAttendance, getHodAttendanceSummary } from "../controllers/hod.attendance.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// HOD department faculty — all faculty belonging to the same department as the HOD
// 1. Queries Hod table to get HOD's department
// 2. Uses that department to search Faculty table for all department faculty
router.get("/faculty", requireRole([Role.HOD, Role.FACULTY, Role.DIRECTOR]), getHodDepartmentFaculty);
router.get("/department/faculty", requireRole([Role.HOD, Role.FACULTY, Role.DIRECTOR]), getHodDepartmentFaculty);

// HOD faculty workload — department-scoped faculty list
// Also accessible to FACULTY with designation "HOD" (resolved in controller)
router.get("/faculty/workload", requireRole([Role.HOD, Role.FACULTY, Role.DIRECTOR]), getHodFacultyWorkload);

// Support looking up department faculty by specific HOD ID (e.g. for Director or admin lookup)
router.get("/:id/faculty", requireRole([Role.HOD, Role.FACULTY, Role.DIRECTOR]), getHodDepartmentFaculty);

// HOD attendance routes (scoped to HOD department)
router.get("/attendance", requireRole([Role.HOD, Role.FACULTY, Role.DIRECTOR]), getHodAttendance);
router.get("/attendance/summary", requireRole([Role.HOD, Role.FACULTY, Role.DIRECTOR]), getHodAttendanceSummary);

// Only Director can create HODs
router.post("/", requireRole([Role.DIRECTOR]), createHOD);
router.get("/", getHODs);

export default router;
