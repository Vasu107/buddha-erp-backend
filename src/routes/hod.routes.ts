import { Router } from "express";
import { createHOD, getHODs } from "../controllers/hod.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// Only Director can create HODs
router.post("/", requireRole([Role.DIRECTOR]), createHOD);
router.get("/", getHODs);

export default router;
