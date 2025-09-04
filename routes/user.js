import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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
 * CREATE a new user (must belong to same company)
 */
/**
 * CREATE a new user (must belong to same company)
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ error: "Only admin or superadmin can create users" });
    }

    const { name, email, password, role, companyId, status, permissions } = req.body;

    if (!name || !email || !password || !role || !companyId) {
      return res.status(400).json({
        error: "name, email, password, role, and companyId are required",
      });
    }

    if (!["admin", "manager", "user"].includes(role)) {
      return res
        .status(400)
        .json({ error: "Invalid role. Must be admin, manager, or user" });
    }

    // Verify company exists and get plan
    const company = await prisma.company.findUnique({
      where: { id: parseInt(companyId) },
      select: {
        plan: true,
        maxAdmins: true,
        maxManagers: true,
        maxUsers: true,
      },
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Check current counts against plan limits
    const [adminCount, managerCount, userCount] = await Promise.all([
      prisma.user.count({ where: { companyId: parseInt(companyId), role: "admin" } }),
      prisma.user.count({ where: { companyId: parseInt(companyId), role: "manager" } }),
      prisma.user.count({ where: { companyId: parseInt(companyId), role: "user" } }),
    ]);

    if (role === "admin" && adminCount >= company.maxAdmins) {
      return res
        .status(400)
        .json({ error: `Cannot add more admins: limit of ${company.maxAdmins} reached` });
    }
    if (role === "manager" && managerCount >= company.maxManagers) {
      return res
        .status(400)
        .json({ error: `Cannot add more managers: limit of ${company.maxManagers} reached` });
    }
    if (role === "user" && userCount >= company.maxUsers) {
      return res
        .status(400)
        .json({ error: `Cannot add more users: limit of ${company.maxUsers} reached` });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Always store permissions (default [])
    const finalPermissions = Array.isArray(permissions) ? permissions : [];

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status: status || "ACTIVE",
        companyId: parseInt(companyId),
        permissions: finalPermissions, // ✅ save permissions too
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        permissions: true,
      },
    });

    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(500)
      .json({ error: "Error creating user", details: error.message });
  }
});


/**
 * LOGIN user with JWT
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.status === "INACTIVE") {
      return res.status(403).json({ error: "User account is inactive" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT including companyId
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId, // ✅ include company
        permissions: user.permissions || []
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    res
      .status(400)
      .json({ error: "Error logging in", details: error.message });
  }
});

/**
 * GET all users (scoped by company)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.user.companyId }, // ✅ scoped
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching users", details: error.message });
  }
});

/**
 * GET single user by ID
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId }, // ✅ scoped
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching user", details: error.message });
  }
});

/**
 * UPDATE user
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { name, email, role, status, password, permissions, lastLogin } =
      req.body;

    const existing = await prisma.user.findFirst({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId }, // ✅ scoped
    });
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData = {
      name,
      email,
      role,
      status,
      permissions,
      lastLogin: lastLogin ? new Date(lastLogin) : undefined,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });

    res.json(user);
  } catch (error) {
    res
      .status(400)
      .json({ error: "Error updating user", details: error.message });
  }
});

/**
 * DELETE user
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.user.findFirst({
      where: { id: parseInt(req.params.id), companyId: req.user.companyId }, // ✅ scoped
    });
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.user.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.status(204).send();
  } catch (error) {
    res
      .status(400)
      .json({ error: "Error deleting user", details: error.message });
  }
});


/**
 * UPDATE user password (multi-tenant)
 */
router.put("/:id/password", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Ensure the user belongs to the same company (multi-tenant safe)
    const existing = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        companyId: req.user.companyId, // ✅ scoped to tenant
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Update password only
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ error: "Error updating password", details: error.message });
  }
});



export default router;
