import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";

const JWT_SECRET = "test_secret_key_for_unit_tests_only";
const getMock = async () => (await import("../config/prisma")).default as any;

const dirToken = jwt.sign({ userId: "dir1", email: "dir@bit.ac.in", role: "DIRECTOR", name: "Dir" }, JWT_SECRET, { expiresIn: "1h" });
const hodToken = jwt.sign({ userId: "hod1", email: "hod@bit.ac.in", role: "HOD", name: "HOD" }, JWT_SECRET, { expiresIn: "1h" });
const stuToken = jwt.sign({ userId: "stu1", email: "stu@bit.ac.in", role: "STUDENT", name: "Stu" }, JWT_SECRET, { expiresIn: "1h" });

describe("GET /api/students", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/students");
    expect(res.status).toBe(401);
  });

  it("returns student list for DIRECTOR", async () => {
    const prisma = await getMock();
    prisma.student.findMany.mockResolvedValue([
      { id: "s1", name: "Ram", rollNumber: "BIT001", department: "CSE", year: 2, section: "A", status: "Active", user: {} },
      { id: "s2", name: "Sita", rollNumber: "BIT002", department: "ECE", year: 3, section: "B", status: "Active", user: {} },
    ]);

    const res = await request(app).get("/api/students").set("Authorization", `Bearer ${dirToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.students).toHaveLength(2);
  });
});

describe("POST /api/students", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when STUDENT tries to create a student", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${stuToken}`)
      .send({ name: "Hack", email: "hack@bit.ac.in" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is too short", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${dirToken}`)
      .send({ name: "X", email: "x@bit.ac.in" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation/i);
  });

  it("returns 400 when email is already in use", async () => {
    const prisma = await getMock();
    prisma.user.findUnique.mockResolvedValue({ id: "existing", email: "exists@bit.ac.in" });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${dirToken}`)
      .send({ name: "Ram Kumar", email: "exists@bit.ac.in" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already in use/i);
  });

  it("returns 201 when DIRECTOR creates a student", async () => {
    const prisma = await getMock();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        user: { create: vi.fn().mockResolvedValue({ id: "u20", name: "Ram", email: "ram@bit.ac.in", role: "STUDENT", password: "h" }) },
        student: { create: vi.fn().mockResolvedValue({ id: "s20", name: "Ram", rollNumber: "BIT020", department: "CSE", year: 1, section: "A" }) },
      });
    });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${dirToken}`)
      .send({ name: "Ram Kumar", email: "ram@bit.ac.in", year: 1, section: "A" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("returns 201 when HOD creates a student", async () => {
    const prisma = await getMock();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        user: { create: vi.fn().mockResolvedValue({ id: "u21", name: "Sita", email: "sita@bit.ac.in", role: "STUDENT", password: "h" }) },
        student: { create: vi.fn().mockResolvedValue({ id: "s21", name: "Sita", rollNumber: "BIT021", department: "CSE", year: 2 }) },
      });
    });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ name: "Sita Devi", email: "sita@bit.ac.in", year: 2 });

    expect(res.status).toBe(201);
  });
});

describe("PUT /api/students/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when STUDENT tries to update another student", async () => {
    const res = await request(app)
      .put("/api/students/s99")
      .set("Authorization", `Bearer ${stuToken}`)
      .send({ name: "Hacked" });
    expect(res.status).toBe(403);
  });

  it("returns 404 when student does not exist", async () => {
    const prisma = await getMock();
    prisma.student.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/students/ghost")
      .set("Authorization", `Bearer ${dirToken}`)
      .send({ name: "Update" });
    expect(res.status).toBe(404);
  });

  it("returns 200 on successful update", async () => {
    const prisma = await getMock();
    prisma.student.findUnique.mockResolvedValue({ id: "s1", name: "Old", year: 1, department: "CSE" });
    prisma.student.update.mockResolvedValue({ id: "s1", name: "New Name", year: 2, department: "CSE" });

    const res = await request(app)
      .put("/api/students/s1")
      .set("Authorization", `Bearer ${dirToken}`)
      .send({ name: "New Name", year: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.student.name).toBe("New Name");
  });
});

describe("DELETE /api/students/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when STUDENT tries to delete", async () => {
    const res = await request(app)
      .delete("/api/students/s1")
      .set("Authorization", `Bearer ${stuToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 when student not found", async () => {
    const prisma = await getMock();
    prisma.student.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/students/ghost")
      .set("Authorization", `Bearer ${dirToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 when DIRECTOR deletes student", async () => {
    const prisma = await getMock();
    prisma.student.findUnique.mockResolvedValue({ id: "s1", userId: "u1" });
    prisma.user.delete.mockResolvedValue({ id: "u1" });

    const res = await request(app)
      .delete("/api/students/s1")
      .set("Authorization", `Bearer ${dirToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
