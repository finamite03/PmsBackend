// routes/task.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * CREATE a new Task
 */
router.post("/", async (req, res) => {
  try {
    const {
      projectId,
      title,
      assignedTo,
      priority,
      status,
      startDate,
      endDate,
      completionDate,
    } = req.body;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is empty" });
    }

    const newTask = await prisma.task.create({
      data: {
        projectId: Number(projectId),
        title,
        assignedTo,
        priority,
        status,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        completionDate: completionDate ? new Date(completionDate) : null,
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
router.get("/", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: { project: true },
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
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id: Number(id) },
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
router.put("/:id", async (req, res) => {
  try {
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

    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        title,
        assignedTo,
        priority,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        completionDate: completionDate ? new Date(completionDate) : null,
      },
    });

    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(400).json({ error: "Failed to update task", details: err.message });
  }
});

/**
 * DELETE a Task
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(400).json({ error: "Failed to delete task", details: err.message });
  }
});

export default router;
