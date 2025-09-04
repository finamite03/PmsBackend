// routes/task.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const prisma = new PrismaClient();


// Utility to check permissions
function hasPermission(user, permission) {
  try {
    const perms = Array.isArray(user.permissions) ? user.permissions : JSON.parse(user.permissions || "[]");
    return perms.includes(permission);
  } catch {
    return false;
  }
}

/**
 * CREATE a new Task
 */
// CREATE Task
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (!(req.user.role === "admin" || hasPermission(req.user, "Assign Tasks"))) {
      return res.status(403).json({ error: "Not allowed to assign tasks" });
    }

    const {
      projectId, title, assignedTo, priority, status, startDate, endDate, completionDate,
    } = req.body;

    // validate project
    const project = await prisma.project.findFirst({
      where: { id: Number(projectId), companyId: req.user.companyId },
    });
    if (!project) return res.status(400).json({ error: "Invalid project or unauthorized access" });

    const newTask = await prisma.task.create({
      data: {
        projectId: Number(projectId),
        title,
        assignedTo: assignedTo ? Number(assignedTo) : null,
        priority,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        completionDate: completionDate ? new Date(completionDate) : null,
        companyId: req.user.companyId,
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        project: true,
      },
    });

    res.status(201).json(newTask);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(400).json({ error: "Error creating task", details: err.message });
  }
});

/**
 * READ all Tasks
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const whereClause = req.user.role === "admin" || hasPermission(req.user, "Assign Tasks")
      ? { companyId: req.user.companyId }
      : { companyId: req.user.companyId, assignedTo: req.user.id };

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/**
 * READ single Task by ID
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findFirst({
      where: { id: Number(id), companyId: req.user.companyId }, // ✅ scoped
      include: { project: true },
    });

    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

/**
 * UPDATE a Task
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    // Only admins or users with "Assign Tasks" permission can edit
    if (!(req.user.role === "admin" || hasPermission(req.user, "Assign Tasks"))) {
      return res.status(403).json({ error: "Not allowed to edit tasks" });
    }

    const { id } = req.params;
    const {
      title,
      assignedTo,
      priority,
      status,
      startDate,
      endDate,
      completionDate,
    } = req.body;

    // Verify task belongs to the same company
    const existing = await prisma.task.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        title,
        assignedTo: assignedTo ? Number(assignedTo) : null, // ✅ safe cast
        priority,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        completionDate: completionDate ? new Date(completionDate) : null,
      },
      include: {
        assignedUser: { select: { id: true, name: true, role: true } }, // ✅ return assigned user info too
        project: { select: { id: true, name: true } },
      },
    });

    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(400).json({
      error: "Failed to update task",
      details: err.message,
    });
  }
});


/**
 * DELETE a Task
 */
// DELETE Task
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete tasks" });
    }

    const { id } = req.params;
    const existing = await prisma.task.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ error: "Task not found" });

    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(400).json({ error: "Failed to delete task", details: err.message });
  }
});

export default router;
