// routes/project.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";
import { hasPermission } from "../utils/permission.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * CREATE a new Project
 */
// CREATE a new Project
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (!(req.user.role === "admin" || hasPermission(req.user, "Create Projects"))) {
      return res.status(403).json({ error: "Not allowed to create projects" });
    }

    const { name, clientName, startDate, endDate, projectManager, budget, status, priorityLevel, notes } = req.body;

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
        companyId: req.user.companyId,
      },
    });

    res.json(newProject);
  } catch (err) {
    res.status(500).json({ error: "Failed to create project", details: err.message });
  }
});

// READ all Projects
router.get("/", authenticateToken, async (req, res) => {
  try {
    let projects;
    if (req.user.role === "admin" || req.user.role === "manager") {
      // admins/managers see all company projects
      projects = await prisma.project.findMany({
        where: { companyId: req.user.companyId },
        include: { tasks: true, risks: true, resources: true },
      });
    } else {
      // normal users only see projects where they have tasks
      projects = await prisma.project.findMany({
        where: {
          companyId: req.user.companyId,
          tasks: { some: { assignedTo: Number(req.user.id) } },
        },
        include: { tasks: true, risks: true, resources: true },
      });
    }

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects", details: err.message });
  }
});

// UPDATE Project
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (!(req.user.role === "admin" || hasPermission(req.user, "Edit Projects"))) {
      return res.status(403).json({ error: "Not allowed to edit projects" });
    }

    const { id } = req.params;
    const { name, clientName, startDate, endDate, projectManager, budget, status, priorityLevel, notes } = req.body;

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
    res.status(500).json({ error: "Failed to update project", details: err.message });
  }
});

// DELETE Project
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (!(req.user.role === "admin" || hasPermission(req.user, "Delete Projects"))) {
      return res.status(403).json({ error: "Not allowed to delete projects" });
    }

    const { id } = req.params;
    const projectId = Number(id);

    const existing = await prisma.project.findFirst({
      where: { id: projectId, companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ error: "Project not found" });

    const taskCount = await prisma.task.count({
      where: { projectId, companyId: req.user.companyId },
    });

    if (taskCount > 0) {
      return res.status(400).json({ error: "Task is assigned with project, can't delete." });
    }

    await prisma.project.delete({ where: { id: projectId } });
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project", details: err.message });
  }
});

export default router;