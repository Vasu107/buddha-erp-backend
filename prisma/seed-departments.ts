import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Data provided for all faculty members and their official departments
export const FACULTY_DATA: Array<{ "Full Name": string; Department: string }> = [
  {
    "Full Name": "DR. S. N JAISWAL",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR.PAWAN KUMAR SEN",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR. ANOOP KUMAR SRIVASTAVA",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MS. YAMAN KHAN YUSUFZAI",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR. SHYAM BIHARI LAL",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR. MANEESH SINGH",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "DR. RAJAN KUMAR DUBEY",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MS.AKSHITA DUTTA",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "DR. SHRUTI SINGH",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "DR. AWNINDRA VISHWAKARMA",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "PROF. BINAY KUMAR  SRIVASTAVA",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR. VIVEK KUMAR MISHRA",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR. RAHUL JAISWAL",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR. SHYAM MOHAN SINGH",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR. KISHAN KUMAR GOUR",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR. RAJ SAHANI",
    "Department": "Applied Science & Humanities (ASH)"
  },
  {
    "Full Name": "MR.VIJAY KUMAR SRIVASTAV",
    "Department": "Civil Engineering (CE)"
  },
  {
    "Full Name": "MR. BAIJ NATH NISHAD",
    "Department": "Civil Engineering (CE)"
  },
  {
    "Full Name": "MR. ANKUR KUMAR",
    "Department": "Civil Engineering (CE)"
  },
  {
    "Full Name": "MR. PRATISH KANNAUJIYA",
    "Department": "Civil Engineering (CE)"
  },
  {
    "Full Name": "MR  ARUN KUMAR",
    "Department": "Civil Engineering (CE)"
  },
  {
    "Full Name": "DR. AMBUJ KUMAR SHUKLA",
    "Department": "Civil Engineering (CE)"
  },
  {
    "Full Name": "SHIVAM SINGH",
    "Department": "Civil Engineering (CE)"
  },
  {
    "Full Name": "SHIVAM SRIVASTAVA",
    "Department": "Civil Engineering (CE)"
  },
  {
    "Full Name": "DR. ABHINANDAN TRIPATHI",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "DR. SAURABH SINGH",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "DR. ABHISHEK SHAHI",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MR. ALOK KUMAR SRIVASTAVA",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MS. CHAYNIKA SRIVASTAVA",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MRS. POOJA SINGH",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MR. PRASHANT CHATURVEDI",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MR. AMIT SHARMA",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MS. PURVA RAI",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MS. SADHANA SINGH",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "DR. ANIL KUMAR MAURYA",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MR. AMIYA DHAR DWIVEDI",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MR. AKASH GUPTA",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "MR. SATYA PRAKASH SRIVASTAVA",
    "Department": "Computer Science & Engineering (CSE)"
  },
  {
    "Full Name": "DR. ROOP RANAJAN",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "DR. RANJEET KUMAR RAI",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. SHRAWAN KUMAR PANDEY",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. SHASHANK KUMAR SRIVASTAVA",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. NIRANKAR SRIVASTAVA",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. BIRBALKUMAR",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. SALMAN KHAN",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. VINOD JAISWAL",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "Ms. SHREYA SHARMA",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MS. JAHNVI GOEL",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. RAHUL YADAV",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. RAHUL GUPTA",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. AJAY KUMAR SINGH",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "MR. ANAND PRATAP MALL",
    "Department": "Computer Science & Information Technology (CS & IT)"
  },
  {
    "Full Name": "DR. SHASHANK SRIVASTAVA",
    "Department": "AI & ML / Data Science (AIML DS)"
  },
  {
    "Full Name": "MR. RANJEET SINGH",
    "Department": "AI & ML / Data Science (AIML DS)"
  },
  {
    "Full Name": "MR. SATISH KUMAR",
    "Department": "AI & ML / Data Science (AIML DS)"
  },
  {
    "Full Name": "MR.SHAILESH KUMAR PATEL",
    "Department": "AI & ML / Data Science (AIML DS)"
  },
  {
    "Full Name": "MS. ANJUM AHSAN",
    "Department": "AI & ML / Data Science (AIML DS)"
  },
  {
    "Full Name": "MR. KRISHNA JAISWAL",
    "Department": "AI & ML / Data Science (AIML DS)"
  },
  {
    "Full Name": "MR. PANKAJ KUMAR",
    "Department": "AI & ML / Data Science (AIML DS)"
  },
  {
    "Full Name": "MR. PRAVESH KUMAR CHAUHAN",
    "Department": "AI & ML / Data Science (AIML DS)"
  },
  {
    "Full Name": "MR.ANIL KUMAR CHAUDHARY",
    "Department": "Electronics & Communication Engineering (ECE)"
  },
  {
    "Full Name": "MR. ARUN KUMAR MISHRA",
    "Department": "Electronics & Communication Engineering (ECE)"
  },
  {
    "Full Name": "MR. ANIL SINGH",
    "Department": "Electronics & Communication Engineering (ECE)"
  },
  {
    "Full Name": "MR. AKHILESH MISHRA",
    "Department": "Electronics & Communication Engineering (ECE)"
  },
  {
    "Full Name": "MR. DHARMVEER PATEL",
    "Department": "Electronics & Communication Engineering (ECE)"
  },
  {
    "Full Name": "MR. SANDEEP SINGH",
    "Department": "Electronics & Communication Engineering (ECE)"
  },
  {
    "Full Name": "MR SHARIQUE HAYAT",
    "Department": "Mechanical Engineering (ME)"
  },
  {
    "Full Name": "MR. JAWED RAFIQ",
    "Department": "Mechanical Engineering (ME)"
  },
  {
    "Full Name": "MR. RAHUL SRIVASTAVA",
    "Department": "Mechanical Engineering (ME)"
  },
  {
    "Full Name": "MOHD. QAISER",
    "Department": "Mechanical Engineering (ME)"
  },
  {
    "Full Name": "MR. UJJWAL KUMAR SRIVASTAVA",
    "Department": "Mechanical Engineering (ME)"
  },
  {
    "Full Name": "DR. RAJESH KUMAR",
    "Department": "Mechanical Engineering (ME)"
  }
];

// Mapping to normalize common department abbreviations/aliases to the standard name
const DEPT_NORMALIZE_MAP: Record<string, string> = {
  "ASH": "Applied Science & Humanities (ASH)",
  "APPLIED SCIENCE": "Applied Science & Humanities (ASH)",
  "APPLIED SCIENCE & HUMANITIES": "Applied Science & Humanities (ASH)",
  "APPLIED SCIENCE & HUMANITIES (ASH)": "Applied Science & Humanities (ASH)",

  "CIVIL": "Civil Engineering (CE)",
  "CE": "Civil Engineering (CE)",
  "CIVIL ENGINEERING": "Civil Engineering (CE)",
  "CIVIL ENGINEERING (CE)": "Civil Engineering (CE)",

  "CSE": "Computer Science & Engineering (CSE)",
  "COMPUTER SCIENCE": "Computer Science & Engineering (CSE)",
  "COMPUTER SCIENCE & ENGINEERING": "Computer Science & Engineering (CSE)",
  "COMPUTER SCIENCE & ENGINEERING (CSE)": "Computer Science & Engineering (CSE)",

  "CS & IT": "Computer Science & Information Technology (CS & IT)",
  "CS/IT": "Computer Science & Information Technology (CS & IT)",
  "CSIT": "Computer Science & Information Technology (CS & IT)",
  "IT": "Computer Science & Information Technology (CS & IT)",
  "INFORMATION TECHNOLOGY": "Computer Science & Information Technology (CS & IT)",
  "COMPUTER SCIENCE & INFORMATION TECHNOLOGY (CS & IT)": "Computer Science & Information Technology (CS & IT)",

  "AIML": "AI & ML / Data Science (AIML DS)",
  "AI & ML": "AI & ML / Data Science (AIML DS)",
  "DATA SCIENCE": "AI & ML / Data Science (AIML DS)",
  "AIML DS": "AI & ML / Data Science (AIML DS)",
  "AI & ML / DATA SCIENCE": "AI & ML / Data Science (AIML DS)",
  "AI & ML / DATA SCIENCE (AIML DS)": "AI & ML / Data Science (AIML DS)",

  "ECE": "Electronics & Communication Engineering (ECE)",
  "ELECTRONICS": "Electronics & Communication Engineering (ECE)",
  "ELECTRONICS & COMMUNICATION": "Electronics & Communication Engineering (ECE)",
  "ELECTRONICS & COMMUNICATION ENGINEERING": "Electronics & Communication Engineering (ECE)",
  "ELECTRONICS & COMMUNICATION ENGINEERING (ECE)": "Electronics & Communication Engineering (ECE)",

  "ME": "Mechanical Engineering (ME)",
  "MECHANICAL": "Mechanical Engineering (ME)",
  "MECHANICAL ENGINEERING": "Mechanical Engineering (ME)",
  "MECHANICAL ENGINEERING (ME)": "Mechanical Engineering (ME)",
};

/**
 * Normalizes a person's name for robust matching:
 * Removes titles (DR, MR, MS, MRS, PROF, ER, MOHD) and non-alphanumeric chars.
 */
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/^(DR\.|DR|MR\.|MR|MS\.|MS|MRS\.|MRS|PROF\.|PROF|ER\.|ER|MOHD\.|MOHD)\s*/i, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

/**
 * Generates a clean email address from a full name
 */
function generateEmailFromName(name: string, index: number): string {
  const clean = name
    .toLowerCase()
    .replace(/^(dr|mr|ms|mrs|prof|er|mohd)[\s.]+/i, "")
    .replace(/[^a-z0-9]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
  return clean ? `${clean}@bit.ac.in` : `faculty.${index + 1}@bit.ac.in`;
}

/**
 * Derives an appropriate academic designation from name prefix
 */
function deriveDesignation(name: string): string {
  const upper = name.toUpperCase().trim();
  if (upper.startsWith("PROF.") || upper.startsWith("PROF ")) return "Professor";
  if (upper.startsWith("DR.") || upper.startsWith("DR ")) return "Associate Professor";
  return "Assistant Professor";
}

async function fixDepartments() {
  console.log("===============================================================");
  console.log("🚀 STARTING DEPARTMENT FIX SCRIPT FOR HOD & FACULTY TABLES");
  console.log(`📋 Total faculty entries in dataset: ${FACULTY_DATA.length}`);
  console.log("===============================================================\n");

  const defaultPasswordHash = await bcrypt.hash("faculty123", 10);

  // Fetch all existing records from DB
  const existingFaculty = await prisma.faculty.findMany();
  const existingHods = await prisma.hod.findMany();
  const existingUsers = await prisma.user.findMany();

  console.log(`Existing database records:`);
  console.log(` - Faculty: ${existingFaculty.length}`);
  console.log(` - HODs:    ${existingHods.length}`);
  console.log(` - Users:   ${existingUsers.length}\n`);

  let facultyUpdatedCount = 0;
  let facultyCreatedCount = 0;
  let hodUpdatedCount = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // PART 1: Process and sync each of the 72 faculty members in Faculty table
  // ─────────────────────────────────────────────────────────────────────────
  console.log("── PART 1: Syncing Faculty Records With Official Departments ──");

  for (let i = 0; i < FACULTY_DATA.length; i++) {
    const item = FACULTY_DATA[i];
    const rawName = item["Full Name"].trim();
    const targetDept = item.Department.trim();
    const norm = normalizeName(rawName);

    // Try finding existing faculty by exact match or normalized match
    let match = existingFaculty.find(
      (f) => f.name.trim().toLowerCase() === rawName.toLowerCase() ||
             normalizeName(f.name) === norm
    );

    if (match) {
      // Record exists — update department if it differs
      if (match.department !== targetDept) {
        await prisma.faculty.update({
          where: { id: match.id },
          data: {
            department: targetDept,
            name: rawName, // align casing/punctuation
          },
        });
        facultyUpdatedCount++;
        console.log(` [UPDATED] Faculty: "${match.name}" -> Dept: "${targetDept}"`);
      } else {
        console.log(` [OK] Faculty: "${match.name}" already in "${targetDept}"`);
      }
    } else {
      // Record does not exist — create User and Faculty record
      let email = generateEmailFromName(rawName, i);
      let user = existingUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

      // Guarantee unique email
      if (user && user.role !== Role.FACULTY) {
        email = `fac.${Date.now().toString().slice(-4)}.${email}`;
      }

      const createdUser = user ?? await prisma.user.create({
        data: {
          name: rawName,
          email,
          password: defaultPasswordHash,
          role: Role.FACULTY,
        },
      });

      const empId = `EMP${String(100 + i + 1).padStart(4, "0")}`;

      const newFaculty = await prisma.faculty.create({
        data: {
          employeeId: empId,
          name: rawName,
          email,
          department: targetDept,
          designation: deriveDesignation(rawName),
          status: "Active",
          experience: rawName.toUpperCase().includes("DR.") ? 6 : 3,
          userId: createdUser.id,
        },
      });

      existingFaculty.push(newFaculty);
      facultyCreatedCount++;
      console.log(` [CREATED] Faculty: "${rawName}" (${empId}) -> Dept: "${targetDept}"`);
    }

    // Also check if this person is currently in the HOD table and update their HOD record
    const hodMatch = existingHods.find(
      (h) => h.name.trim().toLowerCase() === rawName.toLowerCase() ||
             normalizeName(h.name) === norm
    );

    if (hodMatch && hodMatch.department !== targetDept) {
      await prisma.hod.update({
        where: { id: hodMatch.id },
        data: { department: targetDept },
      });
      hodUpdatedCount++;
      console.log(` [UPDATED] HOD: "${hodMatch.name}" -> Dept: "${targetDept}"`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART 2: Standardize existing HOD table departments
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n── PART 2: Standardizing Existing HOD Records in HOD Table ──");

  const currentHods = await prisma.hod.findMany();
  for (const hod of currentHods) {
    const curDept = hod.department.trim();
    const upperDept = curDept.toUpperCase();

    // Check if the HOD's department matches any known alias/short-code
    const standardDept = DEPT_NORMALIZE_MAP[upperDept] ||
      Object.values(DEPT_NORMALIZE_MAP).find((d) => d.toLowerCase() === curDept.toLowerCase());

    if (standardDept && standardDept !== curDept) {
      await prisma.hod.update({
        where: { id: hod.id },
        data: { department: standardDept },
      });
      hodUpdatedCount++;
      console.log(` [UPDATED] HOD "${hod.name}" department normalized: "${curDept}" -> "${standardDept}"`);
    } else {
      console.log(` [OK] HOD "${hod.name}" department is: "${curDept}"`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART 3: Summary of Departments and Faculty counts in database
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n===============================================================");
  console.log("📊 DEPARTMENT SYNC SUMMARY");
  console.log("===============================================================");
  console.log(`Faculty updated: ${facultyUpdatedCount}`);
  console.log(`Faculty created: ${facultyCreatedCount}`);
  console.log(`HODs updated:    ${hodUpdatedCount}`);

  console.log("\nBreakdown by Department (Faculty Count):");
  const allFinalFaculty = await prisma.faculty.findMany();
  const allFinalHods = await prisma.hod.findMany();

  const deptCounts: Record<string, { faculty: number; hods: string[] }> = {};

  for (const f of allFinalFaculty) {
    if (!deptCounts[f.department]) deptCounts[f.department] = { faculty: 0, hods: [] };
    deptCounts[f.department].faculty++;
  }

  for (const h of allFinalHods) {
    if (!deptCounts[h.department]) deptCounts[h.department] = { faculty: 0, hods: [] };
    deptCounts[h.department].hods.push(h.name);
  }

  for (const [dept, info] of Object.entries(deptCounts)) {
    console.log(` - ${dept}:`);
    console.log(`     Faculty members: ${info.faculty}`);
    console.log(`     HOD(s): ${info.hods.length > 0 ? info.hods.join(", ") : "None assigned yet"}`);
  }

  console.log("\n✅ DEPARTMENT FIX COMPLETED SUCCESSFULLY!");
  console.log("===============================================================");
}

fixDepartments()
  .catch((error) => {
    console.error("❌ Error running department fix script:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

