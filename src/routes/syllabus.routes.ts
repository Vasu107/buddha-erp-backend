import { Router } from "express";
import { getSyllabusList, createSyllabus, updateSyllabus, deleteSyllabus } from "../controllers/syllabus.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// GET all — all authenticated users
router.get("/", getSyllabusList);

// POST — Director and HOD
router.post("/", requireRole([Role.DIRECTOR, Role.HOD]), createSyllabus);

// PUT — Director and HOD
router.put("/:id", requireRole([Role.DIRECTOR, Role.HOD]), updateSyllabus);

// DELETE — Director only
router.delete("/:id", requireRole([Role.DIRECTOR]), deleteSyllabus);

export default router;

