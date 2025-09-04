// routes/dashboard.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js"; // ✅ Import middleware

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Protect all routes with JWT
router.use(authenticateToken);

// Utility: check if user is admin or has certain permission
function hasPermission(user, permission) {
  try {
    const perms = Array.isArray(user.permissions)
      ? user.permissions
      : JSON.parse(user.permissions || "[]");
    return perms.includes(permission);
  } catch {
    return false;
  }
}

// Fetch project status counts for PieChart
router.get("/project-status", async (req, res) => {
  try {
    let projects;

    if (req.user.role === "admin") {
      // ✅ Admin → all projects in company
      projects = await prisma.project.findMany({
        where: { companyId: req.user.companyId },
        select: { status: true },
      });
    } else {
      // 👤 User → only their projects
      projects = await prisma.project.findMany({
        where: {
          companyId: req.user.companyId,
          tasks: { some: { assignedTo: Number(req.user.id) } }, // ✅ filter by assigned tasks
        },
        select: { status: true },
      });
    }

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
    if (!req.user?.companyId) {
      return res.status(400).json({ error: "Company ID missing from user context" });
    }

    let tasks;

    if (req.user.role === "admin" || req.user.role === "manager") {
      // Admin sees all tasks in the company
      tasks = await prisma.task.findMany({
        where: { companyId: req.user.companyId },
        select: { status: true },
      });
    } else {
      // Manager/User → only their assigned tasks
      tasks = await prisma.task.findMany({
        where: {
          companyId: req.user.companyId,
          assignedTo: Number(req.user.id), // ✅ must be number, not string
        },
        select: { status: true },
      });
    }

    const statusCounts = [
      { name: "Pending", value: tasks.filter(t => t.status === "PENDING").length },
      { name: "In-Progress", value: tasks.filter(t => t.status === "IN-PROGRESS").length },
      { name: "Completed", value: tasks.filter(t => t.status === "COMPLETED").length },
    ];

    res.json(statusCounts);
  } catch (err) {
    console.error("Error in /task-status:", err);
    res.status(500).json({ error: "Failed to fetch task status data" });
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

      let projects, tasks;

      if (req.user.role === "admin") {
        // ✅ Admin → count all company projects/tasks
        projects = await prisma.project.count({
          where: {
            companyId: req.user.companyId,
            createdAt: { gte: startDate, lte: endDate },
          },
        });

        tasks = await prisma.task.count({
          where: {
            companyId: req.user.companyId,
            createdAt: { gte: startDate, lte: endDate },
          },
        });
      } else {
        // 👤 User/Manager → only assigned tasks/projects
        projects = await prisma.project.count({
          where: {
            companyId: req.user.companyId,
            tasks: { some: { assignedTo: Number(req.user.id) } }, // ✅ filter by task assignment
            createdAt: { gte: startDate, lte: endDate },
          },
        });

        tasks = await prisma.task.count({
          where: {
            companyId: req.user.companyId,
            assignedTo: Number(req.user.id), // ✅ cast to number
            createdAt: { gte: startDate, lte: endDate },
          },
        });
      }

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
    let projects, tasks, resources;

    if (req.user.role === "admin" || req.user.role === "manager") {
      // ✅ Admin → see all
      projects = await prisma.project.findMany({
        where: { companyId: req.user.companyId },
        include: { tasks: true, risks: true, resources: true },
      });

      tasks = await prisma.task.findMany({
        where: { companyId: req.user.companyId },
        include: { project: true },
      });

      resources = await prisma.resource.findMany({
        where: { companyId: req.user.companyId },
        include: { project: true },
      });
    } else {
      // 👤 Manager/User → only assigned projects, tasks, and resources
      projects = await prisma.project.findMany({
        where: {
          companyId: req.user.companyId,
          tasks: { some: { assignedTo: Number(req.user.id) } }, // ✅ filter by assigned tasks
        },
        include: { tasks: true, risks: true, resources: true },
      });

      tasks = await prisma.task.findMany({
        where: {
          companyId: req.user.companyId,
          assignedTo: Number(req.user.id), // ✅ cast to number
        },
        include: { project: true },
      });

      resources = await prisma.resource.findMany({
        where: {
          companyId: req.user.companyId,
          project: {
            tasks: { some: { assignedTo: Number(req.user.id) } }, // ✅ indirect relation
          },
        },
        include: { project: true },
      });
    }

    res.json({ projects, tasks, resources });
  } catch (err) {
    console.error("Error in /overview:", err);
    res.status(400).json({ error: err.message });
  }
});



export default router;
