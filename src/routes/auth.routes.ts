import { Router } from "express";
import { login, getMe, logout } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.get("/me", authenticateToken, getMe);
router.post("/logout", logout);

export default router;
