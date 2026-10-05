import { Router } from "express";
import { upsertResult, getResults, getRankSheet } from "../controllers/result.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// GET results — all authenticated (role-scoped in controller)
router.get("/", getResults);

// GET rank sheet — Director, HOD, Faculty can view
router.get("/ranksheet", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), getRankSheet);

// POST upsert result — Faculty, HOD, Director can enter marks
router.post("/", requireRole([Role.FACULTY, Role.HOD, Role.DIRECTOR]), upsertResult);

export default router;
