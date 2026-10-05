import { Router } from "express";
import { createHOD, getHODs } from "../controllers/hod.controller";
import { getHodAttendance, getHodAttendanceSummary } from "../controllers/hod.attendance.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// HOD attendance routes (scoped to HOD department)
router.get("/attendance", requireRole([Role.HOD, Role.DIRECTOR]), getHodAttendance);
router.get("/attendance/summary", requireRole([Role.HOD, Role.DIRECTOR]), getHodAttendanceSummary);

// Only Director can create HODs
router.post("/", requireRole([Role.DIRECTOR]), createHOD);
router.get("/", getHODs);

export default router;
