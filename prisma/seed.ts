import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Buddha ERP database...");

  // 1. Director
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

  console.log("✅ Director user seeded: director@bit.ac.in / director123");

  // 2. HOD (CSE)
  const hodEmail = "hod.cse@bit.ac.in";
  const hashedPasswordHOD = await bcrypt.hash("hod123", 10);

  const hodUser = await prisma.user.upsert({
    where: { email: hodEmail },
    update: { password: hashedPasswordHOD },
    create: {
      name: "Prof. Rajesh Sharma",
      email: hodEmail,
      password: hashedPasswordHOD,
      role: Role.HOD,
    },
  });

  await prisma.hod.upsert({
    where: { employeeId: "HOD001" },
    update: {},
    create: {
      employeeId: "HOD001",
      name: "Prof. Rajesh Sharma",
      email: hodEmail,
      department: "CSE",
      userId: hodUser.id,
    },
  });

  console.log("✅ HOD user seeded: hod.cse@bit.ac.in / hod123");

  // 3. Faculty (CSE)
  const facultyEmail = "faculty.cse@bit.ac.in";
  const hashedPasswordFaculty = await bcrypt.hash("faculty123", 10);

  const facultyUser = await prisma.user.upsert({
    where: { email: facultyEmail },
    update: { password: hashedPasswordFaculty },
    create: {
      name: "Dr. Anjali Verma",
      email: facultyEmail,
      password: hashedPasswordFaculty,
      role: Role.FACULTY,
    },
  });

  await prisma.faculty.upsert({
    where: { employeeId: "FAC001" },
    update: {},
    create: {
      employeeId: "FAC001",
      name: "Dr. Anjali Verma",
      email: facultyEmail,
      department: "CSE",
      userId: facultyUser.id,
    },
  });

  console.log("✅ Faculty user seeded: faculty.cse@bit.ac.in / faculty123");

  // 4. Student (CSE)
  const studentEmail = "student.cse@bit.ac.in";
  const hashedPasswordStudent = await bcrypt.hash("student123", 10);

  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { password: hashedPasswordStudent },
    create: {
      name: "Aman Gupta",
      email: studentEmail,
      password: hashedPasswordStudent,
      role: Role.STUDENT,
    },
  });

  await prisma.student.upsert({
    where: { rollNumber: "21001" },
    update: {},
    create: {
      rollNumber: "21001",
      name: "Aman Gupta",
      email: studentEmail,
      department: "CSE",
      year: 3,
      userId: studentUser.id,
    },
  });

  console.log("✅ Student user seeded: student.cse@bit.ac.in / student123");
  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
