# Buddha ERP Backend Architecture

The backend is structured into clear **Category-Wise Domains** and **Role-Based Access Modules** for high maintainability, security, and developer clarity.

---

## 📁 Directory Structure

```text
src/
├── config/                  # Database & Environment configuration
│   └── prisma.ts            # Prisma Client singleton
│
├── middleware/              # Authentication & Role Authorization
│   └── auth.ts              # JWT verification & requireRole middleware
│
├── controllers/             # Request handlers organized by Domain & Role
│   ├── auth.controller.ts       # Authentication (Login, Profile, Logout)
│   ├── director.controller.ts   # Director analytics & management
│   ├── hod.controller.ts        # HOD operations & management
│   ├── faculty.controller.ts    # Faculty management & operations
│   ├── student.controller.ts    # Student management & operations
│   ├── user.controller.ts       # Generic user management
│   ├── notice.controller.ts     # Notice board operations
│   ├── subject.controller.ts    # Course & curriculum management
│   ├── attendance.controller.ts # Attendance logging & analytics
│   └── result.controller.ts     # Exam results & SGPA/CGPA calculations
│
├── routes/                  # API Route Definitions by Category & Role
│   ├── auth.routes.ts       # /api/auth
│   ├── director.routes.ts   # /api/director & /api/roles/director
│   ├── hod.routes.ts        # /api/hods & /api/roles/hod
│   ├── faculty.routes.ts    # /api/faculty & /api/roles/faculty
│   ├── student.routes.ts    # /api/students & /api/roles/student
│   ├── user.routes.ts       # /api/users
│   ├── notice.routes.ts     # /api/notices
│   ├── subject.routes.ts    # /api/subjects
│   ├── attendance.routes.ts # /api/attendance
│   └── result.routes.ts     # /api/results
│
├── types/                   # TypeScript interfaces & Express type augmentations
│   └── express.d.ts
│
└── index.ts                 # Main App Entrypoint & Route Mounting
```

---

## 🔑 Role-Based Access Matrix

| Role | Access Rights |
| :--- | :--- |
| 👑 **DIRECTOR** | Access to all system resources, dashboard statistics, add/edit/delete HODs, Faculty, and Students. |
| 🏢 **HOD** | Department-level administration, add/manage Faculty and Students in their branch, assign Class Representatives. |
| 👨‍🏫 **FACULTY** | Class attendance entry, marks upload, student creation, timetable access. |
| 🎓 **STUDENT** | Read-only access to their own attendance, results, timetables, and notice boards. |

---

## 🚀 API Endpoint Mapping

### 1. Role-Based Endpoints (`/api/roles/...`)
- `/api/roles/director` — Director stats & administrative control.
- `/api/roles/hod` — HOD department management.
- `/api/roles/faculty` — Faculty tasks.
- `/api/roles/student` — Student self-service dashboard.

### 2. Category / Resource Endpoints (`/api/...`)
- `/api/auth` — Login (`POST`), Current user (`GET /me`), Logout (`POST`).
- `/api/students` — Add student (`POST`), List (`GET`), Update (`PUT /:id`), Delete (`DELETE /:id`).
- `/api/faculty` — Add teacher (`POST`), List (`GET`), Update (`PUT /:id`), Delete (`DELETE /:id`).
- `/api/notices` — Create and fetch notice board items.
- `/api/subjects` — Manage curriculum subjects.
- `/api/attendance` — Log & view student attendance.
- `/api/results` — Record & fetch academic marks.
