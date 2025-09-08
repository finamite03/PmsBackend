// routes/resource.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";
import { hasPermission } from "../utils/permission.js"; 

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
      return res
        .status(400)
        .json({ error: "Invalid project or unauthorized access" });
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
        status: "ACTIVE",             // ✅ set default status
      },
      include: { project: true },
    });

    res.json(newResource);
  } catch (err) {
    console.error("Error creating resource:", err);
    res.status(500).json({ error: "Failed to create resource", details: err.message });
  }
});


/**
 * READ all Resources for a company
 */
// READ all Resources (permission-aware)
router.get("/", authenticateToken, async (req, res) => {
  try {
    let resources;

    if (req.user.role === "admin" || req.user.role === "superadmin") {
      // Admins / superadmins see all company resources
      resources = await prisma.resource.findMany({
        where: { companyId: req.user.companyId },
        include: { project: true },
      });
    } else if (hasPermission(req.user, "View Resources") || hasPermission(req.user, "Manage Team Resources")) {
      // Managers/users see only resources linked to their projects
      resources = await prisma.resource.findMany({
        where: {
          companyId: req.user.companyId,
          project: {
            tasks: {
              some: { assignedTo: req.user.id }, // ✅ restrict by user's assigned tasks
            },
          },
        },
        include: { project: true },
      });
    } else {
      return res.status(403).json({ error: "Not allowed to view resources" });
    }

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
      status,      // ✅ allow status update
      projectId,   // ✅ include projectId
    } = req.body;

    // Ensure resource belongs to the company
    const existing = await prisma.resource.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ error: "Resource not found" });

    // Optional: check that the projectId belongs to the same company
    let projectCheck = null;
    if (projectId) {
      projectCheck = await prisma.project.findFirst({
        where: { id: Number(projectId), companyId: req.user.companyId },
      });
      if (!projectCheck) {
        return res.status(400).json({ error: "Invalid project or unauthorized access" });
      }
    }

    const updatedResource = await prisma.resource.update({
      where: { id: Number(id) },
      data: {
        resourceType,
        assignedProject,
        projectId: projectId ? Number(projectId) : existing.projectId, // ✅ update project
        allocationStart: allocationStart ? new Date(allocationStart) : existing.allocationStart,
        allocationEnd: allocationEnd ? new Date(allocationEnd) : existing.allocationEnd,
        utilizationRate,
        status: status || existing.status, // ✅ update if provided
      },
      include: { project: true }, // ✅ return project info for UI
    });

    res.json(updatedResource);
  } catch (err) {
    console.error("Error updating resource:", err);
    res.status(500).json({ error: "Failed to update resource", details: err.message });
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

    await prisma.resource.update({
      where: { id: Number(id) },
      data: { status: "DELETED" }, // add enum or isDeleted flag
    });

    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

export default router;
