import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";

const JWT_SECRET = "test_secret_key_for_unit_tests_only";
const getMock = async () => (await import("../config/prisma")).default as any;

const hodToken = jwt.sign(
  { userId: "hod1", email: "hod.cse@bit.ac.in", role: "HOD", name: "Dr HOD" },
  JWT_SECRET, { expiresIn: "1h" }
);
const dirToken = jwt.sign(
  { userId: "dir1", email: "dir@bit.ac.in", role: "DIRECTOR", name: "Dir" },
  JWT_SECRET, { expiresIn: "1h" }
);
const stuToken = jwt.sign(
  { userId: "stu1", email: "stu@bit.ac.in", role: "STUDENT", name: "Stu" },
  JWT_SECRET, { expiresIn: "1h" }
);

describe("GET /api/faculty", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/faculty");
    expect(res.status).toBe(401);
  });

  it("returns faculty list filtered by HOD department", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.faculty.findMany.mockResolvedValue([
      { id: "f1", name: "Dr. Anjali", email: "anjali@bit.ac.in", department: "CSE", employeeId: "FAC001",
        designation: "Assistant Professor", status: "Active", experience: 5, user: { id: "u1" } },
    ]);

    const res = await request(app)
      .get("/api/faculty")
      .set("Authorization", `Bearer ${hodToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.faculty).toHaveLength(1);
    expect(res.body.faculty[0].department).toBe("CSE");
  });

  it("returns all faculty when DIRECTOR requests", async () => {
    const prisma = await getMock();
    prisma.faculty.findMany.mockResolvedValue([
      { id: "f1", name: "A", department: "CSE", user: {} },
      { id: "f2", name: "B", department: "ECE", user: {} },
    ]);

    const res = await request(app)
      .get("/api/faculty")
      .set("Authorization", `Bearer ${dirToken}`);

    expect(res.status).toBe(200);
    expect(res.body.faculty).toHaveLength(2);
  });
});

describe("POST /api/faculty", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when STUDENT tries to create faculty", async () => {
    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", `Bearer ${stuToken}`)
      .send({ name: "X", email: "x@bit.ac.in" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is too short", async () => {
    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ name: "X", email: "x@bit.ac.in" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation/i);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ name: "Dr Test", email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is already in use", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.user.findUnique.mockResolvedValue({ id: "u999", email: "existing@bit.ac.in" });

    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ name: "Dr Existing", email: "existing@bit.ac.in" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already in use/i);
  });

  it("returns 201 when HOD successfully creates faculty", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.faculty.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        user: { create: vi.fn().mockResolvedValue({ id: "u10", name: "Dr New", email: "new@bit.ac.in", role: "FACULTY", password: "hash" }) },
        faculty: { create: vi.fn().mockResolvedValue({ id: "f10", name: "Dr New", email: "new@bit.ac.in", department: "CSE", employeeId: "FAC010", designation: "Assistant Professor", status: "Active", experience: 2 }) },
        hod: { create: vi.fn() },
      });
    });

    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ name: "Dr New Faculty", email: "new@bit.ac.in" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe("PUT /api/faculty/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when HOD tries to update faculty from another department", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.faculty.findUnique.mockResolvedValue({ id: "f99", department: "ECE" });

    const res = await request(app)
      .put("/api/faculty/f99")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ name: "Hacked" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/access denied/i);
  });

  it("returns 404 when faculty id does not exist", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.faculty.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/faculty/nonexistent")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ name: "Update" });

    expect(res.status).toBe(404);
  });

  it("returns 200 when HOD updates faculty in their own department", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.faculty.findUnique.mockResolvedValue({ id: "f1", department: "CSE" });
    prisma.faculty.update.mockResolvedValue({ id: "f1", name: "Updated Name", department: "CSE" });

    const res = await request(app)
      .put("/api/faculty/f1")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.faculty.name).toBe("Updated Name");
  });
});

describe("DELETE /api/faculty/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when STUDENT tries to delete faculty", async () => {
    const res = await request(app)
      .delete("/api/faculty/f1")
      .set("Authorization", `Bearer ${stuToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 403 when HOD tries to delete faculty from another department", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.faculty.findUnique.mockResolvedValue({ id: "f2", department: "ECE", userId: "u2" });

    const res = await request(app)
      .delete("/api/faculty/f2")
      .set("Authorization", `Bearer ${hodToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 when faculty not found", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.faculty.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/faculty/ghost")
      .set("Authorization", `Bearer ${hodToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 when HOD deletes faculty in their own department", async () => {
    const prisma = await getMock();
    prisma.hod.findUnique.mockResolvedValue({ userId: "hod1", department: "CSE" });
    prisma.faculty.findUnique.mockResolvedValue({ id: "f1", department: "CSE", userId: "u1" });
    prisma.user.delete.mockResolvedValue({ id: "u1" });

    const res = await request(app)
      .delete("/api/faculty/f1")
      .set("Authorization", `Bearer ${hodToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
