import { Router } from "express";
import { createNotice, getNotices, deleteNotice } from "../controllers/notice.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// GET notices — all authenticated users (role-filtered in controller)
router.get("/", getNotices);

// POST notice — Director and HOD only
router.post("/", requireRole([Role.DIRECTOR, Role.HOD]), createNotice);

// DELETE notice — Director and HOD only
router.delete("/:id", requireRole([Role.DIRECTOR, Role.HOD]), deleteNotice);

export default router;
