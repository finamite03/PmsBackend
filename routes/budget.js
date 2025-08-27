// routes/budget.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * CREATE a new Risk
 */
router.post("/", async (req, res) => {
  try {
    const { projectId, description, severityLevel, mitigationPlan, riskOwner, status } = req.body;

    const newRisk = await prisma.risk.create({
      data: {
        projectId,
        description,
        severityLevel,
        mitigationPlan,
        riskOwner,
        status,
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
    const risk = await prisma.risk.findUnique({
      where: { id: Number(id) },
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

    const updatedRisk = await prisma.risk.update({
      where: { id: Number(id) },
      data: { description, severityLevel, mitigationPlan, riskOwner, status },
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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.risk.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Risk deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete risk" });
  }
});

export default router;
