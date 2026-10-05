import { Router } from "express";
import { getDirectorDashboardStats } from "../controllers/director.controller";
import { createFaculty, getFaculty, updateFaculty, deleteFaculty } from "../controllers/faculty.controller";
import { createStudent, getStudents, updateStudent, deleteStudent } from "../controllers/student.controller";
import { createHOD, getHODs } from "../controllers/hod.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);
router.use(requireRole([Role.DIRECTOR]));

// Director Dashboard & Stats
router.get("/stats", getDirectorDashboardStats);

// Director Faculty Management
router.post("/faculty", createFaculty);
router.get("/faculty", getFaculty);
router.put("/faculty/:id", updateFaculty);
router.delete("/faculty/:id", deleteFaculty);

// Director Student Management
router.post("/students", createStudent);
router.get("/students", getStudents);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);

// Director HOD Management
router.post("/hods", createHOD);
router.get("/hods", getHODs);

export default router;
