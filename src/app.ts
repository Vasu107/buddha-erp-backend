import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import directorRoutes from "./routes/director.routes";
import hodRoutes from "./routes/hod.routes";
import facultyRoutes from "./routes/faculty.routes";
import facultyRoleRoutes from "./routes/faculty.role.routes";
import studentRoutes from "./routes/student.routes";
import noticeRoutes from "./routes/notice.routes";
import subjectRoutes from "./routes/subject.routes";
import attendanceRoutes from "./routes/attendance.routes";
import resultRoutes from "./routes/result.routes";
import curriculumRoutes from "./routes/curriculum.routes";
import syllabusRoutes from "./routes/syllabus.routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files (PDFs, etc.)
app.use("/uploads", express.static(path.resolve(__dirname, "../../../uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/roles/faculty", facultyRoleRoutes);
app.use("/api/roles/student", studentRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/director", directorRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/hods", hodRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/curriculum", curriculumRoutes);
app.use("/api/syllabus", syllabusRoutes);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
