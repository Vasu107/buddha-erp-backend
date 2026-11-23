import { Request, Response } from "express";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists at startup
const UPLOADS_DIR = path.resolve(__dirname, "../../../../uploads/curriculum");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ---------- Zod schemas ----------

const createCurriculumSchema = z.object({
  schemeName: z.string().min(2, "Scheme name required"),
  department: z.string().min(1, "Department required"),
  academicYear: z.string().min(4, "Academic year required"),
  totalCredits: z.number().int().min(60).max(300),
  semestersCount: z.number().int().min(2).max(12),
  regulations: z.string().min(2, "Regulations required"),
  status: z.enum(["Active", "Draft", "Archived"]).optional().default("Active"),
});

const updateCurriculumSchema = z.object({
  schemeName: z.string().min(2).optional(),
  department: z.string().min(1).optional(),
  academicYear: z.string().min(4).optional(),
  totalCredits: z.number().int().min(60).max(300).optional(),
  semestersCount: z.number().int().min(2).max(12).optional(),
  regulations: z.string().min(2).optional(),
  status: z.enum(["Active", "Draft", "Archived"]).optional(),
});

// ---------- Multer ----------

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ---------- Controllers ----------

export const getCurriculumPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const deptQuery = getQueryString(req.query.department);
    const statusQuery = getQueryString(req.query.status);
    const searchQuery = getQueryString(req.query.search);

    const whereClause: any = {};
    if (deptQuery) whereClause.department = deptQuery;
    if (statusQuery) whereClause.status = statusQuery;
    if (searchQuery) {
      whereClause.OR = [
        { schemeName: { contains: searchQuery, mode: "insensitive" } },
        { regulations: { contains: searchQuery, mode: "insensitive" } },
        { department: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const curriculums = await prisma.curriculumPlan.findMany({
      where: whereClause,
      orderBy: [{ academicYear: "desc" }, { department: "asc" }],
    });

    res.status(200).json({ success: true, count: curriculums.length, curriculums });
  } catch (error: any) {
    console.error("Get curriculum plans error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const createCurriculumPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createCurriculumSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const curriculum = await prisma.curriculumPlan.create({ data: parseResult.data });
    res.status(201).json({ success: true, message: "Curriculum plan created", data: curriculum });
  } catch (error: any) {
    console.error("Create curriculum error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const updateCurriculumPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Curriculum plan ID is required" });
      return;
    }

    const parseResult = updateCurriculumSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: "Validation failed", errors: parseResult.error.errors });
      return;
    }

    const existing = await prisma.curriculumPlan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Curriculum plan not found" });
      return;
    }

    const updated = await prisma.curriculumPlan.update({ where: { id }, data: parseResult.data });
    res.status(200).json({ success: true, message: "Curriculum plan updated", data: updated });
  } catch (error: any) {
    console.error("Update curriculum error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteCurriculumPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Curriculum plan ID is required" });
      return;
    }

    const existing = await prisma.curriculumPlan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Curriculum plan not found" });
      return;
    }

    await prisma.curriculumPlan.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Curriculum plan deleted" });
  } catch (error: any) {
    console.error("Delete curriculum error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const uploadCurriculumPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Curriculum plan ID is required" });
      return;
    }

    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ success: false, message: "PDF file is required" });
      return;
    }

    const existing = await prisma.curriculumPlan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Curriculum plan not found" });
      return;
    }

    const pdfUrl = `/uploads/curriculum/${file.filename}`;
    const updated = await prisma.curriculumPlan.update({
      where: { id },
      data: { pdfUrl },
    });

    res.status(200).json({ success: true, message: "PDF uploaded successfully", data: updated });
  } catch (error: any) {
    console.error("Upload curriculum PDF error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteCurriculumPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Curriculum plan ID is required" });
      return;
    }

    const existing = await prisma.curriculumPlan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Curriculum plan not found" });
      return;
    }

    const updated = await prisma.curriculumPlan.update({
      where: { id },
      data: { pdfUrl: null },
    });

    res.status(200).json({ success: true, message: "PDF removed", data: updated });
  } catch (error: any) {
    console.error("Delete curriculum PDF error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
