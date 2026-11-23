import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Buddha ERP database...");

  // ─────────────────────────────────────────────
  // 1. Director
  // ─────────────────────────────────────────────
  const directorEmail = "director@bit.ac.in";
  const hashedPasswordDirector = await bcrypt.hash("director123", 10);

  const directorUser = await prisma.user.upsert({
    where: { email: directorEmail },
    update: { password: hashedPasswordDirector },
    create: {
      name: "Dr. Director Head",
      email: directorEmail,
      password: hashedPasswordDirector,
      role: Role.DIRECTOR,
    },
  });

  await prisma.director.upsert({
    where: { employeeId: "DIR001" },
    update: {},
    create: {
      employeeId: "DIR001",
      name: "Dr. Director Head",
      email: directorEmail,
      userId: directorUser.id,
    },
  });

  console.log("OK Director seeded: director@bit.ac.in / director123");

  // ─────────────────────────────────────────────
  // 2. HOD — Computer Science & Engineering (CSE)
  // ─────────────────────────────────────────────
  const hodCseEmail = "hod.cse@bit.ac.in";
  const hashedHodCse = await bcrypt.hash("hod123", 10);

  const hodCseUser = await prisma.user.upsert({
    where: { email: hodCseEmail },
    update: { password: hashedHodCse },
    create: {
      name: "Prof. Rajesh Sharma",
      email: hodCseEmail,
      password: hashedHodCse,
      role: Role.HOD,
    },
  });

  await prisma.hod.upsert({
    where: { employeeId: "HOD001" },
    update: {},
    create: {
      employeeId: "HOD001",
      name: "Prof. Rajesh Sharma",
      email: hodCseEmail,
      department: "CSE",
      userId: hodCseUser.id,
    },
  });

  console.log("OK CSE HOD seeded: hod.cse@bit.ac.in / hod123  -> department=CSE");

  // ─────────────────────────────────────────────
  // 3. HOD — Civil Engineering (CIVIL)

  const hodCivilEmail = "hod.civil@bit.ac.in";
  const hashedHodCivil = await bcrypt.hash("hod123", 10);

  const hodCivilUser = await prisma.user.upsert({
    where: { email: hodCivilEmail },
    update: { password: hashedHodCivil },
    create: {
      name: "Dr. Prakash Mehta",
      email: hodCivilEmail,
      password: hashedHodCivil,
      role: Role.HOD,
    },
  });

  await prisma.hod.upsert({
    where: { employeeId: "HOD002" },
    update: {},
    create: {
      employeeId: "HOD002",
      name: "Dr. Prakash Mehta",
      email: hodCivilEmail,
      department: "CIVIL",
      userId: hodCivilUser.id,
    },
  });

  console.log("OK Civil HOD seeded: hod.civil@bit.ac.in / hod123  -> department=CIVIL");

  // ─────────────────────────────────────────────
  // 4. HOD — Applied Science & Humanities (ASH)
  // ─────────────────────────────────────────────
  const hodAshEmail = "hod.ash@bit.ac.in";
  const hashedHodAsh = await bcrypt.hash("hod123", 10);

  const hodAshUser = await prisma.user.upsert({
    where: { email: hodAshEmail },
    update: { password: hashedHodAsh },
    create: {
      name: "Dr. Asha Verma",
      email: hodAshEmail,
      password: hashedHodAsh,
      role: Role.HOD,
    },
  });

  await prisma.hod.upsert({
    where: { employeeId: "HOD003" },
    update: {},
    create: {
      employeeId: "HOD003",
      name: "Dr. Asha Verma",
      email: hodAshEmail,
      department: "ASH",
      userId: hodAshUser.id,
    },
  });

  console.log("OK ASH HOD seeded: hod.ash@bit.ac.in / hod123  -> department=ASH");
  // ─────────────────────────────────────────────
  const hodCivilEmail = "hod.civil@bit.ac.in";
  const hashedHodCivil = await bcrypt.hash("hod123", 10);

  const hodCivilUser = await prisma.user.upsert({
    where: { email: hodCivilEmail },
    update: { password: hashedHodCivil },
    create: {
      name: "Dr. Prakash Mehta",
      email: hodCivilEmail,
      password: hashedHodCivil,
      role: Role.HOD,
    },
  });

  await prisma.hod.upsert({
    where: { employeeId: "HOD002" },
    update: {},
    create: {
      employeeId: "HOD002",
      name: "Dr. Prakash Mehta",
      email: hodCivilEmail,
      department: "CIVIL",
      userId: hodCivilUser.id,
    },
  });

  console.log("OK Civil HOD seeded: hod.civil@bit.ac.in / hod123  -> department=CIVIL");

  // ─────────────────────────────────────────────
  // 4. Faculty — CSE Department (3 members)
  // ─────────────────────────────────────────────
  const cseFaculty = [
    { employeeId: "FAC001", name: "Dr. Anjali Verma",  email: "faculty.cse@bit.ac.in",   designation: "Assistant Professor", experience: 6  },
    { employeeId: "FAC002", name: "Prof. Suresh Vet",  email: "suresh.vet@bit.ac.in",    designation: "Associate Professor", experience: 12 },
    { employeeId: "FAC003", name: "Dr. Vikram Kumar",  email: "vikram.kumar@bit.ac.in",  designation: "Assistant Professor", experience: 4  },
    // Faculty with designation "HOD" — role stays FACULTY but they get
    // department-scoped data (CSE) when they log in via the faculty portal.
    { employeeId: "FAC004", name: "Dr. Meera Patel",   email: "meera.patel.cse@bit.ac.in", designation: "HOD", experience: 15 },
  ];


  const defaultFacultyHash = await bcrypt.hash("faculty123", 10);

  for (const f of cseFaculty) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: { password: defaultFacultyHash },
      create: { name: f.name, email: f.email, password: defaultFacultyHash, role: Role.FACULTY },
    });
    await prisma.faculty.upsert({
      where: { employeeId: f.employeeId },
      update: { name: f.name, designation: f.designation, experience: f.experience },
      create: {
        employeeId: f.employeeId,
        name: f.name,
        email: f.email,
        department: "CSE",
        designation: f.designation,
        status: "Active",
        experience: f.experience,
        userId: user.id,
      },
    });
  }

  console.log(`OK CSE Faculty seeded (${cseFaculty.length} members) — password: faculty123`);

  // ─────────────────────────────────────────────
  // 5. Faculty — Civil Engineering Department (3 members)
  // ─────────────────────────────────────────────
  const civilFaculty = [
    { employeeId: "FAC101", name: "Dr. Ramesh Yadav", email: "ramesh.yadav@bit.ac.in", designation: "Professor",           experience: 18 },
    { employeeId: "FAC102", name: "Prof. Sunita Jain", email: "sunita.jain@bit.ac.in", designation: "Associate Professor",  experience: 10 },
    { employeeId: "FAC103", name: "Dr. Anil Tiwari",  email: "anil.tiwari@bit.ac.in", designation: "Assistant Professor",  experience: 3  },
  ];

  for (const f of civilFaculty) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: { password: defaultFacultyHash },
      create: { name: f.name, email: f.email, password: defaultFacultyHash, role: Role.FACULTY },
    });
    await prisma.faculty.upsert({
      where: { employeeId: f.employeeId },
      update: { name: f.name, designation: f.designation, experience: f.experience },
      create: {
        employeeId: f.employeeId,
        name: f.name,
        email: f.email,
        department: "CIVIL",
        designation: f.designation,
        status: "Active",
        experience: f.experience,
        userId: user.id,
      },
    });
  }

  console.log(`OK Civil Faculty seeded (${civilFaculty.length} members) — password: faculty123`);

  // ─────────────────────────────────────────────
  // 6. Students — CSE + Civil cohorts
  // ─────────────────────────────────────────────
  const seedStudents = [
    // CSE students
    { rollNumber: "21001", name: "Aman Gupta",    email: "student.cse@bit.ac.in",       department: "CSE",   branch: "CSE",   course: "CSE",   year: 3, section: "A", session: "2024-25", cgpa: 8.9, attendance: 88, status: "Active" },
    { rollNumber: "21002", name: "Priya Sharma",  email: "priya.sharma@bit.ac.in",      department: "CSE",   branch: "CSE",   course: "CSE",   year: 3, section: "A", session: "2024-25", cgpa: 8.7, attendance: 92, status: "Active" },
    { rollNumber: "21003", name: "Rahul Verma",   email: "rahul.verma@bit.ac.in",       department: "CSE",   branch: "CSE",   course: "CSE",   year: 3, section: "B", session: "2024-25", cgpa: 8.1, attendance: 79, status: "Active" },
    { rollNumber: "21004", name: "Sneha Patel",   email: "sneha.patel@bit.ac.in",       department: "CSE",   branch: "CSE",   course: "CSE",   year: 3, section: "B", session: "2024-25", cgpa: 9.2, attendance: 95, status: "Active" },
    { rollNumber: "22005", name: "Vikas Kumar",   email: "vikas.cse@bit.ac.in",         department: "CSE",   branch: "CSE",   course: "CSE",   year: 2, section: "A", session: "2024-25", cgpa: 8.4, attendance: 85, status: "Active" },
    { rollNumber: "22006", name: "Kavita Singh",  email: "kavita.singh@bit.ac.in",      department: "CSE",   branch: "CSE",   course: "CSE",   year: 2, section: "A", session: "2024-25", cgpa: 7.9, attendance: 82, status: "Active" },
    { rollNumber: "23007", name: "Deepak Nair",   email: "deepak.nair@bit.ac.in",       department: "CSE",   branch: "CSE",   course: "CSE",   year: 1, section: "A", session: "2024-25", cgpa: 8.0, attendance: 89, status: "Active" },
    { rollNumber: "23008", name: "Sunita Rao",    email: "sunita.rao@bit.ac.in",        department: "CSE",   branch: "CSE",   course: "CSE",   year: 1, section: "B", session: "2024-25", cgpa: 8.6, attendance: 91, status: "Active" },
    { rollNumber: "20009", name: "Rohan Das",     email: "rohan.das@bit.ac.in",         department: "CSE",   branch: "CSE",   course: "CSE",   year: 4, section: "A", session: "2024-25", cgpa: 8.8, attendance: 87, status: "Active" },
    { rollNumber: "20010", name: "Neha Joshi",    email: "neha.joshi@bit.ac.in",        department: "CSE",   branch: "CSE",   course: "CSE",   year: 4, section: "B", session: "2024-25", cgpa: 9.0, attendance: 94, status: "Active" },
    // Civil Engineering students
    { rollNumber: "21101", name: "Arjun Singh",   email: "arjun.singh@bit.ac.in",       department: "CIVIL", branch: "CIVIL", course: "CIVIL", year: 3, section: "A", session: "2024-25", cgpa: 7.8, attendance: 83, status: "Active" },
    { rollNumber: "21102", name: "Meena Kumari",  email: "meena.kumari@bit.ac.in",      department: "CIVIL", branch: "CIVIL", course: "CIVIL", year: 3, section: "A", session: "2024-25", cgpa: 8.2, attendance: 87, status: "Active" },
    { rollNumber: "22103", name: "Sanjay Mishra", email: "sanjay.mishra@bit.ac.in",     department: "CIVIL", branch: "CIVIL", course: "CIVIL", year: 2, section: "A", session: "2024-25", cgpa: 7.5, attendance: 78, status: "Active" },
    { rollNumber: "23104", name: "Pooja Gupta",   email: "pooja.gupta.civil@bit.ac.in", department: "CIVIL", branch: "CIVIL", course: "CIVIL", year: 1, section: "A", session: "2024-25", cgpa: 8.4, attendance: 90, status: "Active" },
  ];

  const defaultStudentHash = await bcrypt.hash("student123", 10);

  for (const s of seedStudents) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, password: defaultStudentHash },
      create: { name: s.name, email: s.email, password: defaultStudentHash, role: Role.STUDENT },
    });

    const existingStudent = await prisma.student.findFirst({
      where: { OR: [{ rollNumber: s.rollNumber }, { email: s.email }] },
    });

    if (existingStudent) {
      await prisma.student.update({
        where: { id: existingStudent.id },
        data: { rollNumber: s.rollNumber, name: s.name, email: s.email, department: s.department, branch: s.branch, course: s.course, year: s.year, section: s.section, session: s.session, cgpa: s.cgpa, attendance: s.attendance, status: s.status, userId: user.id },
      });
    } else {
      await prisma.student.create({
        data: { rollNumber: s.rollNumber, name: s.name, email: s.email, department: s.department, branch: s.branch, course: s.course, year: s.year, section: s.section, session: s.session, cgpa: s.cgpa, attendance: s.attendance, status: s.status, userId: user.id },
      });
    }
  }

  console.log(`OK Seeded ${seedStudents.length} students (10 CSE + 4 CIVIL)`);

  // ─────────────────────────────────────────────
  // 7. Academic Courses (Degrees) & Sessions
  // ─────────────────────────────────────────────
  const btech = await prisma.course.upsert({
    where: { code: "BTECH" },
    update: { durationYears: 4, totalSemesters: 8 },
    create: {
      code: "BTECH",
      name: "Bachelor of Technology (B.Tech)",
      durationYears: 4,
      totalSemesters: 8,
      department: "Engineering",
      description: "4-Year Bachelor of Technology with 8 academic semesters",
      status: "Active",
    },
  });

  const bsc = await prisma.course.upsert({
    where: { code: "BSC" },
    update: { durationYears: 3, totalSemesters: 6 },
    create: {
      code: "BSC",
      name: "Bachelor of Science (B.Sc)",
      durationYears: 3,
      totalSemesters: 6,
      department: "Applied Science & Humanities (ASH)",
      description: "3-Year Bachelor of Science with 6 academic semesters",
      status: "Active",
    },
  });

  // Sessions: 2022-2026 (B.Tech), 2023-2027 (B.Tech), 2023-2026 (B.Sc)
  await prisma.academicSession.upsert({
    where: { sessionName_courseCode: { sessionName: "2023-2027", courseCode: "B.Tech" } },
    update: { totalSemesters: 8 },
    create: {
      sessionName: "2023-2027",
      startYear: 2023,
      endYear: 2027,
      courseId: btech.id,
      courseCode: "B.Tech",
      totalSemesters: 8,
      currentSemester: 1,
      status: "Active",
    },
  });

  await prisma.academicSession.upsert({
    where: { sessionName_courseCode: { sessionName: "2022-2026", courseCode: "B.Tech" } },
    update: { totalSemesters: 8 },
    create: {
      sessionName: "2022-2026",
      startYear: 2022,
      endYear: 2026,
      courseId: btech.id,
      courseCode: "B.Tech",
      totalSemesters: 8,
      currentSemester: 3,
      status: "Active",
    },
  });

  await prisma.academicSession.upsert({
    where: { sessionName_courseCode: { sessionName: "2023-2026", courseCode: "B.Sc" } },
    update: { totalSemesters: 6 },
    create: {
      sessionName: "2023-2026",
      startYear: 2023,
      endYear: 2026,
      courseId: bsc.id,
      courseCode: "B.Sc",
      totalSemesters: 6,
      currentSemester: 1,
      status: "Active",
    },
  });

  console.log("OK Courses & Sessions seeded (B.Tech: 8 sems / B.Sc: 6 sems, Sessions: 2023-2027, 2022-2026)");

  // ─────────────────────────────────────────────
  // 8. Sample Semester 1 Subjects & Opted Subjects
  // ─────────────────────────────────────────────
  const sampleSubjects = [
    { code: "CS101", name: "Engineering Mathematics I", department: "Computer Science & Engineering (CSE)", credits: 4, year: 1, semester: 1 },
    { code: "CS102", name: "Programming for Problem Solving", department: "Computer Science & Engineering (CSE)", credits: 4, year: 1, semester: 1 },
    { code: "CS103", name: "Engineering Physics", department: "Computer Science & Engineering (CSE)", credits: 4, year: 1, semester: 1 },
    { code: "CS104", name: "Basic Electrical Engineering", department: "Computer Science & Engineering (CSE)", credits: 3, year: 1, semester: 1 },
  ];

  for (const s of sampleSubjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { credits: s.credits, semester: s.semester, department: s.department },
      create: {
        code: s.code,
        name: s.name,
        department: s.department,
        credits: s.credits,
        year: s.year,
        semester: s.semester,
        courseId: btech.id,
        courseName: "B.Tech",
      },
    });
  }

  // Opt subjects for 1st sem student (Aman Gupta) in Session 2023-2027
  const studentAman = await prisma.student.findFirst({ where: { rollNumber: "21001" } });
  const allSem1Subjects = await prisma.subject.findMany({ where: { semester: 1 } });

  if (studentAman) {
    for (const sub of allSem1Subjects) {
      const existingOpt = await prisma.studentSubject.findFirst({
        where: {
          studentId: studentAman.id,
          subjectId: sub.id,
          semester: 1,
          session: "2023-2027",
        },
      });

      if (!existingOpt) {
        await prisma.studentSubject.create({
          data: {
            studentId: studentAman.id,
            subjectId: sub.id,
            semester: 1,
            session: "2023-2027",
            department: studentAman.department,
            course: "B.Tech",
            isOpted: true,
            status: "Enrolled",
          },
        });
      }
    }
    console.log(`OK Opted ${allSem1Subjects.length} Semester 1 subjects for student ${studentAman.name} (Session 2023-2027)`);
  }

  console.log("\n=== SEEDING COMPLETE — LOGIN CREDENTIALS ===");
  console.log("DIRECTOR  : director@bit.ac.in       / director123");
  console.log("HOD (CSE) : hod.cse@bit.ac.in        / hod123   -> sees CSE faculty only");
  console.log("HOD (CIVIL): hod.civil@bit.ac.in     / hod123   -> sees CIVIL faculty only");
  console.log("FACULTY   : faculty.cse@bit.ac.in    / faculty123");
  console.log("STUDENT   : student.cse@bit.ac.in    / student123");
  console.log("============================================");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
