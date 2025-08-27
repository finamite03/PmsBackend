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
        },
      });
  
      res.json(newProject);
    } catch (err) {
      res.status(500).json({ error: "Failed to create project", details: err.message });
    }
  });
  
  // Protected: Fetch all projects
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const projects = await prisma.project.findMany({
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
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: Number(id) },
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
router.put("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
