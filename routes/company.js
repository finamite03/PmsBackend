import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { authenticateToken } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();
const SALT_ROUNDS = 10;

const planLimits = {
    BASIC: { maxAdmins: 2, maxManagers: 5, maxUsers: 15 },
    PRO: { maxAdmins: 5, maxManagers: 8, maxUsers: 20 },
    PLATINUM: { maxAdmins: 7, maxManagers: 10, maxUsers: 25 },
};

/**
 * Superadmin creates a company and its admin user
 */
router.post("/", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "superadmin") {
            return res.status(403).json({ error: "Only superadmin can create companies" });
        }

        const { companyName, plan, adminName, adminEmail, adminPassword, maxAdmins, maxManagers, maxUsers } = req.body;

        if (!companyName || !adminName || !adminEmail || !adminPassword) {
            return res.status(400).json({ error: "companyName, adminName, adminEmail, and adminPassword are required" });
        }

        const selectedPlan = plan?.toUpperCase() || "BASIC";
        if (!["BASIC", "PRO", "PLATINUM"].includes(selectedPlan)) {
            return res.status(400).json({ error: "Invalid plan. Must be BASIC, PRO, or PLATINUM" });
        }

        // Use provided limits or default to plan limits
        const limits = {
            maxAdmins: Math.min(parseInt(maxAdmins) || planLimits[selectedPlan].maxAdmins, planLimits[selectedPlan].maxAdmins),
            maxManagers: Math.min(parseInt(maxManagers) || planLimits[selectedPlan].maxManagers, planLimits[selectedPlan].maxManagers),
            maxUsers: Math.min(parseInt(maxUsers) || planLimits[selectedPlan].maxUsers, planLimits[selectedPlan].maxUsers),
        };

        // Hash admin password
        const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

        // Create company with admin fields and limits
        const company = await prisma.company.create({
            data: {
                companyName,
                plan: selectedPlan,
                adminName,
                adminEmail,
                adminPassword: hashedPassword,
                maxAdmins: limits.maxAdmins,
                maxManagers: limits.maxManagers,
                maxUsers: limits.maxUsers,
            },
        });

        // Create admin user linked to this company
        const adminUser = await prisma.user.create({
            data: {
                name: adminName,
                email: adminEmail,
                password: hashedPassword,
                role: "admin",
                status: "ACTIVE",
                companyId: company.id,
            },
        });

        // Strip password before returning
        const { password, ...adminWithoutPassword } = adminUser;

        res.status(201).json({
            message: "Company and admin created successfully",
            company: {
                ...company,
                adminPassword: undefined,
            },
            admin: adminWithoutPassword,
        });
    } catch (error) {
        console.error("Error creating company:", error);
        res.status(500).json({ error: "Error creating company", details: error.message });
    }
});

/**
 * Get companies (all for superadmin with query param, or specific by companyId)
 */
/**
 * Get companies (all for superadmin with query param, or specific by companyId)
 */
router.get("/", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "superadmin") {
            return res.status(403).json({ error: "Only superadmin can view companies" });
        }

        const { all } = req.query;
        const where = all === "true" || !req.user.companyId ? {} : { id: req.user.companyId };

        const companies = await prisma.company.findMany({
            where,
            include: { users: true },
        });

        res.json(companies);
    } catch (error) {
        console.error("Error fetching companies:", error);
        res.status(500).json({ error: "Error fetching companies", details: error.message });
    }
});

/**
 * Get company plan by companyId
 */
router.get("/plan/:companyId", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin" && req.user.role !== "superadmin") {
            return res.status(403).json({ error: "Only admin or superadmin can view company plan" });
        }

        const { companyId } = req.params;
        const company = await prisma.company.findUnique({
            where: { id: parseInt(companyId) },
            select: { id: true, companyName: true, plan: true, maxAdmins: true, maxManagers: true, maxUsers: true },
        });

        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }

        res.json(company);
    } catch (error) {
        res.status(500).json({ error: "Error fetching company plan", details: error.message });
    }
});

/**
 * Update company details
 */
router.patch("/:companyId", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "superadmin") {
            return res.status(403).json({ error: "Only superadmin can update companies" });
        }

        const { companyId } = req.params;
        const { companyName, plan, maxAdmins, maxManagers, maxUsers } = req.body;

        const selectedPlan = plan?.toUpperCase();
        if (plan && !["BASIC", "PRO", "PLATINUM"].includes(selectedPlan)) {
            return res.status(400).json({ error: "Invalid plan. Must be BASIC, PRO, or PLATINUM" });
        }

        // Validate limits if provided
        const limits = selectedPlan
            ? {
                maxAdmins: Math.min(parseInt(maxAdmins) || planLimits[selectedPlan].maxAdmins, planLimits[selectedPlan].maxAdmins),
                maxManagers: Math.min(parseInt(maxManagers) || planLimits[selectedPlan].maxManagers, planLimits[selectedPlan].maxManagers),
                maxUsers: Math.min(parseInt(maxUsers) || planLimits[selectedPlan].maxUsers, planLimits[selectedPlan].maxUsers),
            }
            : {};

        const company = await prisma.company.update({
            where: { id: parseInt(companyId) },
            data: {
                companyName,
                plan: selectedPlan,
                maxAdmins: limits.maxAdmins,
                maxManagers: limits.maxManagers,
                maxUsers: limits.maxUsers,
            },
            select: { id: true, companyName: true, plan: true, maxAdmins: true, maxManagers: true, maxUsers: true },
        });

        res.json({ message: "Company updated successfully", company });
    } catch (error) {
        console.error("Error updating company:", error);
        res.status(500).json({ error: "Error updating company", details: error.message });
    }
});

/**
 * Delete a company
 */
router.delete("/:companyId", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "superadmin") {
            return res.status(403).json({ error: "Only superadmin can delete companies" });
        }

        const { companyId } = req.params;
        await prisma.company.delete({
            where: { id: parseInt(companyId) },
        });

        res.json({ message: "Company deleted successfully" });
    } catch (error) {
        console.error("Error deleting company:", error);
        res.status(500).json({ error: "Error deleting company", details: error.message });
    }
});



/**
 * Toggle user status (ACTIVE/INACTIVE) for a specific company
 */
router.put("/:companyId/user/:userId", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "superadmin") {
            return res.status(403).json({ error: "Only superadmin can toggle user status" });
        }

        const { companyId, userId } = req.params;
        const { status } = req.body;

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({ error: "Status must be ACTIVE or INACTIVE" });
        }

        // Log request details for debugging
        console.log(`Attempting to toggle status for userId: ${userId} in companyId: ${companyId}`);

        // Verify company exists
        const company = await prisma.company.findUnique({
            where: { id: parseInt(companyId) },
            select: { id: true, adminEmail: true },
        });
        if (!company) {
            console.log(`Company not found: ${companyId}`);
            return res.status(404).json({ error: "Company not found" });
        }

        // Verify user exists and belongs to the company
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: { id: true, companyId: true, status: true, role: true, email: true },
        });
        if (!user) {
            console.log(`User not found: ${userId}`);
            return res.status(404).json({ error: "User not found" });
        }
        if (user.companyId !== parseInt(companyId)) {
            console.log(`User ${userId} does not belong to company ${companyId}`);
            return res.status(404).json({ error: "User does not belong to this company" });
        }

        // Start a transaction to ensure atomic updates
        const result = await prisma.$transaction(async (prisma) => {
            // Update the target user's status
            const updatedUser = await prisma.user.update({
                where: { id: parseInt(userId) },
                data: { status },
                select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true },
            });

            // Check if the user is the primary admin
            const isPrimaryAdmin = updatedUser.email === company.adminEmail && updatedUser.role === "admin";
            if (isPrimaryAdmin) {
                // If inactivating the primary admin, inactivate all other users in the company
                if (status === "INACTIVE") {
                    await prisma.user.updateMany({
                        where: { companyId: parseInt(companyId), id: { not: parseInt(userId) } },
                        data: { status: "INACTIVE" },
                    });
                    console.log(`All users for company ${companyId} set to INACTIVE`);
                }
                // If reactivating the primary admin, reactivate all other users in the company
                else if (status === "ACTIVE") {
                    await prisma.user.updateMany({
                        where: { companyId: parseInt(companyId), id: { not: parseInt(userId) } },
                        data: { status: "ACTIVE" },
                    });
                    console.log(`All users for company ${companyId} set to ACTIVE`);
                }
            }

            return updatedUser;
        });

        console.log(`User status updated: ${userId}, new status: ${status}`);
        res.json({ message: "User status updated successfully", user: result });
    } catch (error) {
        console.error("Error toggling user status:", error);
        res.status(500).json({ error: "Error toggling user status", details: error.message });
    }
});


export default router;