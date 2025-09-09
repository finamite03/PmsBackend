import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * GET all activity logs (filtered by entityType and entityId optionally)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.query;

    const where = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId: Number(entityId) } : {}),
    };

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity logs", details: err.message });
  }
});

/**
 * GET activity logs by entity type and entity ID
 */
router.get("/:entityType/:entityId", authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await prisma.activityLog.findMany({
      where: {
        entityType,
        entityId: Number(entityId),
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity logs", details: err.message });
  }
});

export default router;
