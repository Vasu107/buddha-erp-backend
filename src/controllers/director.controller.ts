import { Request, Response } from "express";
import prisma from "../config/prisma";
import { getQueryString } from "../utils/param.utils";

export const getDirectorDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalStudents = await prisma.student.count();
    const activeStudents = await prisma.student.count({ where: { status: "Active" } });
    const totalFaculty = await prisma.faculty.count();
    const activeFaculty = await prisma.faculty.count({ where: { status: "Active" } });
    const pendingFaculty = await prisma.faculty.count({ where: { status: "Pending" } });
    const totalHODs = await prisma.hod.count();

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        totalFaculty,
        activeFaculty,
        pendingFaculty,
        totalHODs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/** GET /director/profile — returns the logged-in director's profile */
export const getDirectorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const director = await prisma.director.findFirst({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
    });

    if (!director) {
      res.status(404).json({ success: false, message: "Director profile not found" });
      return;
    }

    res.status(200).json({ success: true, profile: director });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

/** PUT /director/profile — update logged-in director's name / employeeId */
export const updateDirectorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const director = await prisma.director.findFirst({ where: { userId } });
    if (!director) {
      res.status(404).json({ success: false, message: "Director profile not found" });
      return;
    }

    const { name, employeeId } = req.body as { name?: string; employeeId?: string };

    // Update user name if provided
    if (name && typeof name === "string" && name.trim()) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
      });
    }

    // Update director employeeId if provided
    const updatedDirector = await prisma.director.update({
      where: { id: director.id },
      data: {
        ...(name && name.trim() ? { name: name.trim() } : {}),
        ...(employeeId && employeeId.trim() ? { employeeId: employeeId.trim() } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedDirector,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
