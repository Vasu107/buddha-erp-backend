import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../app";

const JWT_SECRET = "test_secret_key_for_unit_tests_only";

// Pull the mocked prisma
const getMock = async () => (await import("../config/prisma")).default as any;

describe("POST /api/auth/login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "pass123" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation/i);
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "pass123" });
    expect(res.status).toBe(400);
  });

  it("returns 401 when user is not found", async () => {
    const prisma = await getMock();
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@bit.ac.in", password: "pass123" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it("returns 401 when password is wrong", async () => {
    const prisma = await getMock();
    const hash = await bcrypt.hash("correctpass", 10);
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "dir@bit.ac.in", password: hash, role: "DIRECTOR", name: "Dir",
      director: null, hod: null, faculty: null, student: null,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "dir@bit.ac.in", password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it("returns 401 when role param does not match the user role", async () => {
    const prisma = await getMock();
    const hash = await bcrypt.hash("pass123", 10);
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "hod@bit.ac.in", password: hash, role: "HOD", name: "HOD",
      director: null, hod: { id: "h1" }, faculty: null, student: null,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "hod@bit.ac.in", password: "pass123", role: "DIRECTOR" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/role does not match/i);
  });

  it("returns 200 with token on valid credentials", async () => {
    const prisma = await getMock();
    const hash = await bcrypt.hash("dir123", 10);
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "director@bit.ac.in", password: hash, role: "DIRECTOR", name: "Dr Director",
      director: { id: "d1", employeeId: "DIR001", name: "Dr Director" },
      hod: null, faculty: null, student: null,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "director@bit.ac.in", password: "dir123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("director@bit.ac.in");
    expect(res.body.user.password).toBeUndefined(); // password must be stripped
    expect(res.body.profile).toMatchObject({ employeeId: "DIR001" });
  });

  it("strips the password from login response", async () => {
    const prisma = await getMock();
    const hash = await bcrypt.hash("pass", 10);
    prisma.user.findUnique.mockResolvedValue({
      id: "u2", email: "fac@bit.ac.in", password: hash, role: "FACULTY", name: "Fac",
      director: null, hod: null, faculty: { id: "f1" }, student: null,
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "fac@bit.ac.in", password: "pass" });
    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty("password");
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 200 and clears cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/logged out/i);
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeToken = (payload: object) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 404 when user deleted from DB after token issued", async () => {
    const prisma = await getMock();
    prisma.user.findUnique.mockResolvedValue(null);
    const token = makeToken({ userId: "gone", email: "g@bit.ac.in", role: "DIRECTOR", name: "G" });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 with user profile when authenticated", async () => {
    const prisma = await getMock();
    prisma.user.findUnique.mockResolvedValue({
      id: "u1", email: "hod@bit.ac.in", password: "hashed", role: "HOD", name: "Dr HOD",
      director: null, hod: { id: "h1", department: "CSE" }, faculty: null, student: null,
    });
    const token = makeToken({ userId: "u1", email: "hod@bit.ac.in", role: "HOD", name: "Dr HOD" });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("hod@bit.ac.in");
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.profile).toMatchObject({ department: "CSE" });
  });
});
