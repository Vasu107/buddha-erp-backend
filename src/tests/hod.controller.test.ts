import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";

const JWT_SECRET = "test_secret_key_for_unit_tests_only";
const getMock = async () => (await import("../config/prisma")).default as any;

const hodToken = jwt.sign(
  { userId: "hod1", email: "hod.cse@bit.ac.in", role: "HOD", name: "Dr HOD" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

const dirToken = jwt.sign(
  { userId: "dir1", email: "dir@bit.ac.in", role: "DIRECTOR", name: "Dr Director" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

const stuToken = jwt.sign(
  { userId: "stu1", email: "stu@bit.ac.in", role: "STUDENT", name: "Student" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

const facultyHodToken = jwt.sign(
  { userId: "fac_hod1", email: "prof.civil@bit.ac.in", role: "FACULTY", name: "Prof Civil HOD" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

describe("GET /api/hods/faculty - Department Faculty API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no token is provided", async () => {
    const res = await request(app).get("/api/hods/faculty");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 403 when a STUDENT accesses the endpoint", async () => {
    const res = await request(app)
      .get("/api/hods/faculty")
      .set("Authorization", `Bearer ${stuToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when HOD profile is not found in Hod table", async () => {
    const prisma = await getMock();
    prisma.hod.findFirst.mockResolvedValue(null);
    prisma.hod.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/hods/faculty")
      .set("Authorization", `Bearer ${hodToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/hod profile not found/i);
  });

  it("retrieves HOD department from Hod table and fetches all faculty in that department", async () => {
    const prisma = await getMock();

    // 1. Mock Hod table lookup
    prisma.hod.findFirst.mockResolvedValue({
      id: "hod_row_1",
      userId: "hod1",
      name: "Dr. R. Sharma",
      email: "hod.cse@bit.ac.in",
      employeeId: "HOD001",
      department: "Computer Science & Engineering",
    });

    // 2. Mock Faculty table query for that department
    const mockFacultyList = [
      {
        id: "f1",
        name: "Dr. Amit Verma",
        email: "amit@bit.ac.in",
        employeeId: "FAC001",
        department: "Computer Science & Engineering",
        designation: "Associate Professor",
        status: "Active",
        experience: 8,
        user: { id: "u_f1", email: "amit@bit.ac.in", role: "FACULTY", createdAt: new Date() },
      },
      {
        id: "f2",
        name: "Dr. Neha Gupta",
        email: "neha@bit.ac.in",
        employeeId: "FAC002",
        department: "Computer Science & Engineering",
        designation: "Assistant Professor",
        status: "Active",
        experience: 4,
        user: { id: "u_f2", email: "neha@bit.ac.in", role: "FACULTY", createdAt: new Date() },
      },
    ];
    prisma.faculty.findMany.mockResolvedValue(mockFacultyList);

    const res = await request(app)
      .get("/api/hods/faculty")
      .set("Authorization", `Bearer ${hodToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.department).toBe("Computer Science & Engineering");
    expect(res.body.hod.name).toBe("Dr. R. Sharma");
    expect(res.body.count).toBe(2);
    expect(res.body.faculty).toHaveLength(2);
    expect(res.body.faculty[0].name).toBe("Dr. Amit Verma");
    expect(res.body.faculty[1].name).toBe("Dr. Neha Gupta");

    // Verify Prisma faculty.findMany was called with the HOD's department
    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { department: "Computer Science & Engineering" },
          ]),
        }),
      })
    );
  });

  it("supports search, designation, and status filter query parameters", async () => {
    const prisma = await getMock();

    prisma.hod.findFirst.mockResolvedValue({
      id: "hod_row_1",
      userId: "hod1",
      name: "Dr. R. Sharma",
      email: "hod.cse@bit.ac.in",
      employeeId: "HOD001",
      department: "CSE",
    });

    prisma.faculty.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/hods/faculty?search=Amit&designation=Professor&status=Active")
      .set("Authorization", `Bearer ${hodToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { department: "CSE" },
            { designation: "Professor" },
            { status: "Active" },
            expect.objectContaining({
              OR: expect.any(Array),
            }),
          ]),
        }),
      })
    );
  });

  it("supports looking up department faculty by specific HOD ID (e.g. for Director)", async () => {
    const prisma = await getMock();

    prisma.hod.findFirst.mockResolvedValue({
      id: "target_hod_id",
      userId: "user_target",
      name: "Dr. Civil HOD",
      email: "hod.civil@bit.ac.in",
      employeeId: "HOD002",
      department: "Civil Engineering",
    });

    prisma.faculty.findMany.mockResolvedValue([
      {
        id: "f_civ_1",
        name: "Er. Rajesh",
        email: "rajesh@bit.ac.in",
        employeeId: "FAC010",
        department: "Civil Engineering",
        designation: "Assistant Professor",
        status: "Active",
        user: { id: "u_civ_1", email: "rajesh@bit.ac.in", role: "FACULTY" },
      },
    ]);

    const res = await request(app)
      .get("/api/hods/target_hod_id/faculty")
      .set("Authorization", `Bearer ${dirToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.department).toBe("Civil Engineering");
    expect(res.body.faculty).toHaveLength(1);
    expect(res.body.faculty[0].department).toBe("Civil Engineering");
  });

  it("allows FACULTY with HOD designation to access department faculty", async () => {
    const prisma = await getMock();

    prisma.hod.findFirst.mockResolvedValue(null);
    prisma.hod.findUnique.mockResolvedValue(null);
    // Faculty record with HOD designation
    prisma.faculty.findFirst.mockResolvedValue({
      id: "fac_hod_rec",
      userId: "fac_hod1",
      name: "Prof Civil HOD",
      email: "prof.civil@bit.ac.in",
      employeeId: "EMP999",
      department: "Civil Engineering",
      designation: "HOD",
    });

    prisma.faculty.findMany.mockResolvedValue([
      {
        id: "f_civ_2",
        name: "Prof B",
        email: "b@bit.ac.in",
        employeeId: "FAC011",
        department: "Civil Engineering",
        designation: "Assistant Professor",
        status: "Active",
        user: { id: "u_civ_2", email: "b@bit.ac.in", role: "FACULTY" },
      },
    ]);

    const res = await request(app)
      .get("/api/hods/faculty")
      .set("Authorization", `Bearer ${facultyHodToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.department).toBe("Civil Engineering");
    expect(res.body.faculty).toHaveLength(1);
  });
});

