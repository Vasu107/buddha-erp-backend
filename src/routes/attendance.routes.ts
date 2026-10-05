import { Router } from "express";
import { markAttendance, bulkMarkAttendance, getAttendance } from "../controllers/attendance.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// GET attendance — all authenticated (role-scoped in controller)
router.get("/", getAttendance);

// POST single attendance — Faculty, HOD, Director
router.post("/", requireRole([Role.FACULTY, Role.HOD, Role.DIRECTOR]), markAttendance);

// POST bulk attendance — Faculty, HOD, Director
router.post("/bulk", requireRole([Role.FACULTY, Role.HOD, Role.DIRECTOR]), bulkMarkAttendance);

export default router;
