// routes/resource.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();
/**
 * CREATE a new Resource
 */
router.post("/", async (req, res) => {
  try {
    const {
      resourceType,
      assignedProject,
      projectId,
      allocationStart,
      allocationEnd,
      utilizationRate,
    } = req.body;

    const newResource = await prisma.resource.create({
      data: {
        resourceType,
        assignedProject,
        projectId,
        allocationStart: new Date(allocationStart),
        allocationEnd: new Date(allocationEnd),
        utilizationRate,
      },
    });

    res.json(newResource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create resource" });
  }
});

/**
 * READ all Resources
 */
router.get("/", async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
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
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await prisma.resource.findUnique({
      where: { id: Number(id) },
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
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resourceType,
      assignedProject,
      allocationStart,
      allocationEnd,
      utilizationRate,
    } = req.body;

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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

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
