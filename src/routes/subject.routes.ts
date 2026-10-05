import { Router } from "express";
import { createSubject, getSubjects, getSubjectById, deleteSubject } from "../controllers/subject.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// GET all subjects — all authenticated users
router.get("/", getSubjects);
router.get("/:id", getSubjectById);

// POST — Director and HOD only can create subjects
router.post("/", requireRole([Role.DIRECTOR, Role.HOD]), createSubject);

// DELETE — Director only
router.delete("/:id", requireRole([Role.DIRECTOR]), deleteSubject);

export default router;
