import { Router } from "express";
import { createFaculty, getFaculty } from "../controllers/faculty.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// Director and HOD can create faculty members
router.post("/", requireRole([Role.DIRECTOR, Role.HOD]), createFaculty);
router.get("/", getFaculty);

export default router;
