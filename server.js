// server.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Import modular routes
import dashboardRouter from "./routes/dashboard.js";
import budgetRoutes from "./routes/budget.js";
import projectRoutes from "./routes/project.js";
import resourceRoutes from "./routes/resource.js";
import tasksRoutes from "./routes/task.js";   // ✅ renamed to match your task.js
import userRoutes from "./routes/user.js";

const app = express();
const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Adjust to match your React app's URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// =======================
// MOUNT ROUTES
// =======================
app.use("/api/dashboard", dashboardRouter);
app.use("/api/risks", budgetRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/user", userRoutes);

// =======================
// USER ROUTES (inline since you handle auth here)
// =======================
app.post("/users", async (req, res) => {
  try {
    const { name, email, role, status, password, permissions } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: role || "USER",
        status: status || "ACTIVE",
        password: hashedPassword,
        permissions: permissions || [],
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error("Error in /users POST:", err);
    res.status(400).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }

    const user = await prisma.user.findFirst({
      where: { name },
    });

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

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error("Error in /login POST:", err);
    res.status(400).json({ error: err.message });
  }
});

// =======================
// HEALTH CHECK
// =======================
app.get("/", (req, res) => {
  res.send("🚀 Prisma + Express API is running!");
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
