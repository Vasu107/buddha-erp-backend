import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";

const JWT_SECRET = "test_secret_key_for_unit_tests_only";

const makeToken = (payload: object, expiresIn: any = "1h") =>
  jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);

describe("Auth Middleware — authenticateToken", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/token/i);
  });

  it("returns 403 when token is invalid/tampered", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer totally.invalid.token");
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  it("returns 403 when token is expired", async () => {
    const expired = jwt.sign(
      { userId: "u1", email: "a@b.com", role: "DIRECTOR", name: "Test" },
      JWT_SECRET,
      { expiresIn: -1 } // immediately expired
    );
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(403);
  });

  it("passes through to route when valid Bearer token is provided", async () => {
    const token = makeToken({ userId: "u1", email: "dir@bit.ac.in", role: "DIRECTOR", name: "Dr D" });
    // /api/hods is auth-protected — a 200 or 500 (db mock) means middleware passed
    const res = await request(app)
      .get("/api/hods")
      .set("Authorization", `Bearer ${token}`);
    // Middleware passed — not 401/403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("Auth Middleware — requireRole", () => {
  it("returns 403 when a STUDENT tries to access a HOD-only route", async () => {
    const token = makeToken({ userId: "u2", email: "stu@bit.ac.in", role: "STUDENT", name: "Stu" });
    const res = await request(app)
      .get("/api/faculty")
      .set("Authorization", `Bearer ${token}`);
    // GET /api/faculty is open to all authenticated users, so test on a write route:
    const res2 = await request(app)
      .post("/api/faculty")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X", email: "x@bit.ac.in" });
    expect(res2.status).toBe(403);
  });

  it("returns 403 when FACULTY tries to create another faculty", async () => {
    const token = makeToken({ userId: "u3", email: "fac@bit.ac.in", role: "FACULTY", name: "Fac" });
    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Fac", email: "newfac@bit.ac.in" });
    expect(res.status).toBe(403);
  });

  it("allows DIRECTOR to hit director-only routes", async () => {
    const token = makeToken({ userId: "u4", email: "dir@bit.ac.in", role: "DIRECTOR", name: "Dir" });
    const res = await request(app)
      .get("/api/director/stats")
      .set("Authorization", `Bearer ${token}`);
    // Not forbidden — director passes requireRole check
    expect(res.status).not.toBe(403);
  });
});
