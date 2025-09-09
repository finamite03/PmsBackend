import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";
import { hasPermission } from "../utils/permission.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * CREATE a new Budget
 */
router.post("/", authenticateToken, async (req, res) => {
    try {
        // if (!(req.user.role === "admin" || hasPermission(req.user, "Create Budgets"))) {
        //     return res.status(403).json({ error: "Not allowed to create budgets" });
        // }

        if (!req.user.companyId) {
            return res.status(400).json({ error: "Company ID missing in user token" });
        }

        const { projectId, category, allocated, spent = 0, riskId } = req.body;
        const remaining = allocated - spent;
        const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;

        const newBudget = await prisma.budget.create({
            data: {
                category,
                allocated,
                spent,
                remaining,
                utilization,
                project: { connect: { id: projectId } },
                company: { connect: { id: req.user.companyId } },
                ...(riskId ? { risk: { connect: { id: riskId } } } : {}),
            },
        });

        await prisma.activityLog.create({
            data: {
                entityType: "BUDGET",
                entityId: newBudget.id,
                action: "Created budget",
                oldValue: null,
                newValue: JSON.stringify(newBudget),
            },
        });

        res.json(newBudget);
    } catch (err) {
        res.status(500).json({ error: "Failed to create budget", details: err.message });
    }
});

/**
 * READ all Budgets for the company
 */
router.get("/", authenticateToken, async (req, res) => {
    try {
        const budgets = await prisma.budget.findMany({
            where: { companyId: req.user.companyId },
            include: { project: true, risk: true },
        });

        res.json(budgets);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch budgets", details: err.message });
    }
});

/**
 * UPDATE a Budget
 */
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        if (!(req.user.role === "admin" || hasPermission(req.user, "Edit Budgets"))) {
            return res.status(403).json({ error: "Not allowed to edit budgets" });
        }

        const { id } = req.params;
        const { category, allocated, spent, riskId } = req.body;

        const existing = await prisma.budget.findFirst({
            where: { id: Number(id), companyId: req.user.companyId },
        });
        if (!existing) return res.status(404).json({ error: "Budget not found" });

        const remaining = allocated - spent;
        const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;

        const updatedBudget = await prisma.budget.update({
            where: { id: Number(id) },
            data: { category, allocated, spent, remaining, utilization, riskId },
        });

        // Log the update
        await prisma.activityLog.create({
            data: {
                entityType: "BUDGET",
                entityId: updatedBudget.id,
                action: "Updated budget",
                oldValue: JSON.stringify(existing),
                newValue: JSON.stringify(updatedBudget),
            },
        });

        res.json(updatedBudget);
    } catch (err) {
        res.status(500).json({ error: "Failed to update budget", details: err.message });
    }
});

/**
 * DELETE a Budget (hard delete)
 */
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        if (!(req.user.role === "admin" || hasPermission(req.user, "Delete Budgets"))) {
            return res.status(403).json({ error: "Not allowed to delete budgets" });
        }

        const { id } = req.params;

        const existing = await prisma.budget.findFirst({
            where: { id: Number(id), companyId: req.user.companyId },
        });
        if (!existing) return res.status(404).json({ error: "Budget not found" });

        await prisma.budget.delete({ where: { id: Number(id) } });

        // Log the deletion
        await prisma.activityLog.create({
            data: {
                entityType: "BUDGET",
                entityId: Number(id),
                action: "Deleted budget",
                oldValue: JSON.stringify(existing),
                newValue: null,
            },
        });

        res.json({ message: "Budget deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete budget", details: err.message });
    }
});

export default router;
