// routes/resource.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * CREATE a new Resource
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      resourceType,
      assignedProject,
      projectId,
      allocationStart,
      allocationEnd,
      utilizationRate,
    } = req.body;

    // Ensure project belongs to the same company
    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: req.user.companyId },
    });
    if (!project) {
      return res.status(400).json({ error: "Invalid project or unauthorized access" });
    }

    const newResource = await prisma.resource.create({
      data: {
        resourceType,
        assignedProject,
        projectId,
        allocationStart: new Date(allocationStart),
        allocationEnd: new Date(allocationEnd),
        utilizationRate,
        companyId: req.user.companyId, // ✅ attach company
      },
    });

    res.json(newResource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create resource" });
  }
});

/**
 * READ all Resources for a company
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { companyId: req.user.companyId }, // ✅ scoped
      include: { project: true },
    });
    res.json(resources);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

/**
 * READ single Resource by ID
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await prisma.resource.findFirst({
      where: { id: Number(id), companyId: req.user.companyId }, // ✅ scoped
      include: { project: true },
    });

    if (!resource) return res.status(404).json({ error: "Resource not found" });
    res.json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resource" });
  }
});

/**
 * UPDATE a Resource
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resourceType,
      assignedProject,
      allocationStart,
      allocationEnd,
      utilizationRate,
    } = req.body;

    // Ensure resource belongs to the company
    const existing = await prisma.resource.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ error: "Resource not found" });

    const updatedResource = await prisma.resource.update({
      where: { id: Number(id) },
      data: {
        resourceType,
        assignedProject,
        allocationStart: new Date(allocationStart),
        allocationEnd: new Date(allocationEnd),
        utilizationRate,
      },
    });

    res.json(updatedResource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update resource" });
  }
});

/**
 * DELETE a Resource
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure resource belongs to the company
    const existing = await prisma.resource.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ error: "Resource not found" });

    await prisma.resource.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

export default router;
