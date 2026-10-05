import { Request, Response } from "express";
import prisma from "../config/prisma";

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
