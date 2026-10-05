import { Router } from "express";
import { createUser, getUsers, getUserById, deleteUser } from "../controllers/user.controller";
import { authenticateToken, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken);

// Create user based on role: Director, HOD, or Faculty
router.post("/", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), createUser);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.delete("/:id", requireRole([Role.DIRECTOR, Role.HOD, Role.FACULTY]), deleteUser);

export default router;
