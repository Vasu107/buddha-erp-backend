import { Router } from "express";
import { createStudent, getStudents, updateStudent, deleteStudent } from "../controllers/student.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// Director, HOD, and Faculty can manage students
router.post("/", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), createStudent);
router.get("/", getStudents);
router.put("/:id", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), updateStudent);
router.delete("/:id", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), deleteStudent);

export default router;
