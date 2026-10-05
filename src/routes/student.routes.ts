import { Router } from "express";
import { createStudent, getStudents } from "../controllers/student.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// Director, HOD, and Faculty can create students
router.post("/", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), createStudent);
router.get("/", getStudents);

export default router;
