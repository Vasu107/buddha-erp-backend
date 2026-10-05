import { Router } from "express";
import { createFaculty, getFaculty, updateFaculty, deleteFaculty } from "../controllers/faculty.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// Director and HOD can manage faculty members
router.post("/", requireRole([Role.DIRECTOR, Role.HOD]), createFaculty);
router.get("/", getFaculty);
router.put("/:id", requireRole([Role.DIRECTOR, Role.HOD]), updateFaculty);
router.delete("/:id", requireRole([Role.DIRECTOR, Role.HOD]), deleteFaculty);

export default router;
