// routes/project.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * CREATE a new Project
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      clientName,
      startDate,
      endDate,
      projectManager,
      budget,
      status,
      priorityLevel,
      notes,
    } = req.body;

    const newProject = await prisma.project.create({
      data: {
        name,
        clientName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        projectManager,
        budget,
        status,
        priorityLevel,
        notes,
        companyId: req.user.companyId, // ✅ attach company
      },
    });

    res.json(newProject);
  } catch (err) {
    res.status(500).json({ error: "Failed to create project", details: err.message });
  }
});

// Protected: Fetch all projects for this company
router.get("/", authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { companyId: req.user.companyId }, // ✅ scoped
      include: { tasks: true, risks: true, resources: true },
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects", details: err.message });
  }
});

/**
 * READ single Project by ID
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findFirst({
      where: {
        id: Number(id),
        companyId: req.user.companyId, // ✅ scoped
      },
      include: {
        tasks: true,
        risks: true,
        resources: true,
      },
    });

    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

/**
 * UPDATE a Project
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      clientName,
      startDate,
      endDate,
      projectManager,
      budget,
      status,
      priorityLevel,
      notes,
    } = req.body;

    // Ensure project belongs to company
    const existing = await prisma.project.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ error: "Project not found" });

    const updatedProject = await prisma.project.update({
      where: { id: Number(id) },
      data: {
        name,
        clientName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        projectManager,
        budget,
        status,
        priorityLevel,
        notes,
      },
    });

    res.json(updatedProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

/**
 * DELETE a Project
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const projectId = Number(id);

    // Ensure project belongs to company
    const existing = await prisma.project.findFirst({
      where: { id: projectId, companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ error: "Project not found" });

    // Check if the project has associated tasks
    const taskCount = await prisma.task.count({
      where: { projectId, companyId: req.user.companyId },
    });

    if (taskCount > 0) {
      return res.status(400).json({
        error: "Task is assigned with project, can't delete.",
      });
    }

    // Delete the project if no tasks are associated
    await prisma.project.delete({
      where: { id: projectId },
    });

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    if (err.code === "P2025") {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.status(500).json({ error: "Failed to delete project", details: err.message });
    }
  }
});

export default router;
