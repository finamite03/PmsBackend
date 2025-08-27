import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * CREATE a new user
 */
router.post("/", async (req, res) => {
    try {
        const { name, email, role, status, password, permissions } = req.body;

        if (!password) {
            return res.status(400).json({ error: "Password is required" });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                role,
                status,
                password: hashedPassword,
                permissions,
            },
        });

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        res.status(400).json({ error: "Error creating user", details: error.message });
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

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
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
        res.status(400).json({ error: "Error logging in", details: error.message });
    }
});

/**
 * GET all users
 */
router.get("/", async (req, res) => {
    try {
        const users = await prisma.user.findMany({
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
        res.status(500).json({ error: "Error fetching users", details: error.message });
    }
});

/**
 * GET single user by ID
 */
router.get("/:id", async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) },
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
        res.status(500).json({ error: "Error fetching user", details: error.message });
    }
});

/**
 * UPDATE user
 */
router.put("/:id", async (req, res) => {
    try {
        const { name, email, role, status, password, permissions, lastLogin } =
            req.body;

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
        res.status(400).json({ error: "Error updating user", details: error.message });
    }
});

/**
 * DELETE user
 */
router.delete("/:id", async (req, res) => {
    try {
        await prisma.user.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: "Error deleting user", details: error.message });
    }
});

export default router;
