import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { AuthPayload } from "../types/express";

const JWT_SECRET = process.env.JWT_SECRET || "buddha_erp_super_secret_jwt_key_2026_director_hod_faculty";

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.split(" ")[1]) || req.cookies?.token;

  if (!token) {
    res.status(401).json({ success: false, message: "Authentication token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: "Invalid or expired token" });
    return;
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(", ")}]. Your role is ${req.user.role}.`,
      });
      return;
    }

    next();
  };
};
