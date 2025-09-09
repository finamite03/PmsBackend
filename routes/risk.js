// routes/budget.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js"; // <-- add this

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

router.post("/", async (req, res) => {
  try {
    const { projectId, description, severityLevel, mitigationPlan, riskOwner, status } = req.body;

    // Ensure project belongs to the same company
    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: req.user.companyId },
    });

    if (!project) return res.status(403).json({ error: "Invalid project for this company" });

    const newRisk = await prisma.risk.create({
      data: {
        projectId,
        description,
        severityLevel,
        mitigationPlan,
        riskOwner,
        status,
        companyId: req.user.companyId, // <--- enforce multitenancy
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "RISK",
        entityId: newRisk.id,
        action: "Created risk",
        oldValue: null,
        newValue: JSON.stringify(newRisk),
      },
    });

    res.json(newRisk);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create risk" });
  }
});

/**
 * READ all Risks
 */
router.get("/", async (req, res) => {
  try {
    const risks = await prisma.risk.findMany({
      where: { companyId: req.user.companyId },
      include: { project: true },
    });
    res.json(risks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch risks" });
  }
});

/**
 * READ single Risk by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const risk = await prisma.risk.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
      include: { project: true },
    });

    if (!risk) return res.status(404).json({ error: "Risk not found" });
    res.json(risk);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch risk" });
  }
});

/**
 * UPDATE a Risk
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { description, severityLevel, mitigationPlan, riskOwner, status } = req.body;

    // First check ownership
    const risk = await prisma.risk.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
    });
    if (!risk) return res.status(404).json({ error: "Risk not found or not in your company" });

    const updatedRisk = await prisma.risk.update({
      where: { id: Number(id) },
      data: { description, severityLevel, mitigationPlan, riskOwner, status },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "RISK",
        entityId: updatedRisk.id,
        action: "Updated risk",
        oldValue: null,
        newValue: JSON.stringify(updatedRisk),
      },
    });

    res.json(updatedRisk);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update risk" });
  }
});

/**
 * DELETE a Risk
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the risk in the same company
    const risk = await prisma.risk.findFirst({
      where: { id: Number(id), companyId: req.user.companyId },
    });

    if (!risk) {
      return res.status(404).json({ error: "Risk not found or not in your company" });
    }

    // Soft delete: mark as deleted
    const updatedRisk = await prisma.risk.update({
      where: { id: Number(id) },
      data: { status: "DELETED" },
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        entityType: "RISK",
        entityId: updatedRisk.id,
        action: "Deleted risk",
        oldValue: null,
        newValue: JSON.stringify(updatedRisk),
      },
    });

    res.json({ message: "Risk marked as deleted", risk: updatedRisk });
  } catch (err) {
    console.error("Error deleting risk:", err);
    res.status(500).json({ error: "Failed to delete risk", details: err.message });
  }
});


export default router;
