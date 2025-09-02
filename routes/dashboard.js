// routes/dashboard.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js"; // ✅ Import middleware

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Protect all routes with JWT
router.use(authenticateToken);

// Fetch project status counts for PieChart
router.get("/project-status", async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { companyId: req.user.companyId }, // ✅ scoped
      select: { status: true },
    });

    const statusCounts = [
      { name: "Planned", value: projects.filter(p => p.status === "PLANNED").length },
      { name: "Active", value: projects.filter(p => p.status === "ACTIVE").length },
      { name: "Completed", value: projects.filter(p => p.status === "COMPLETED").length },
      { name: "On Hold", value: projects.filter(p => p.status === "ON_HOLD").length },
    ];

    res.json(statusCounts);
  } catch (err) {
    console.error("Error in /project-status:", err);
    res.status(400).json({ error: err.message });
  }
});

// Fetch task status counts for BarChart
router.get("/task-status", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { companyId: req.user.companyId }, // ✅ scoped
      select: { status: true },
    });

    const statusCounts = [
      { name: "Pending", value: tasks.filter(t => t.status === "PENDING").length },
      { name: "In Progress", value: tasks.filter(t => t.status === "IN_PROGRESS").length },
      { name: "Completed", value: tasks.filter(t => t.status === "COMPLETED").length },
    ];

    res.json(statusCounts);
  } catch (err) {
    console.error("Error in /task-status:", err);
    res.status(400).json({ error: err.message });
  }
});

// Fetch trend data for AreaChart
router.get("/trends", async (req, res) => {
  try {
    const now = new Date();
    const trendData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString("default", { month: "short" });

      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const projects = await prisma.project.count({
        where: {
          companyId: req.user.companyId, // ✅ scoped
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      const tasks = await prisma.task.count({
        where: {
          companyId: req.user.companyId, // ✅ scoped
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      trendData.push({
        month: monthName,
        projects,
        tasks,
      });
    }

    res.json(trendData);
  } catch (err) {
    console.error("Error in /trends:", err);
    res.status(400).json({ error: err.message });
  }
});

// Fetch all data for DashboardCards and GanttChart
router.get("/overview", async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { companyId: req.user.companyId }, // ✅ scoped
      include: { tasks: true, risks: true, resources: true },
    });

    const tasks = await prisma.task.findMany({
      where: { companyId: req.user.companyId }, // ✅ scoped
      include: { project: true },
    });

    const resources = await prisma.resource.findMany({
      where: { companyId: req.user.companyId }, // ✅ scoped
      include: { project: true },
    });

    res.json({ projects, tasks, resources });
  } catch (err) {
    console.error("Error in /overview:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
