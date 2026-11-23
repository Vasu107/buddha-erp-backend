import { Router } from "express";
import {
  getCurriculumPlans,
  createCurriculumPlan,
  updateCurriculumPlan,
  deleteCurriculumPlan,
  uploadCurriculumPdf,
  deleteCurriculumPdf,
  upload,
} from "../controllers/curriculum.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// GET all — all authenticated users (Director, HOD, Faculty, Student)
router.get("/", getCurriculumPlans);

// POST — Director only
router.post("/", requireRole([Role.DIRECTOR]), createCurriculumPlan);

// PUT — Director only
router.put("/:id", requireRole([Role.DIRECTOR]), updateCurriculumPlan);

// DELETE — Director only
router.delete("/:id", requireRole([Role.DIRECTOR]), deleteCurriculumPlan);

// POST PDF upload — Director only
router.post("/:id/pdf", requireRole([Role.DIRECTOR]), upload.single("pdf"), uploadCurriculumPdf);

// DELETE PDF — Director only
router.delete("/:id/pdf", requireRole([Role.DIRECTOR]), deleteCurriculumPdf);

export default router;
