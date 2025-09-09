import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Import modular routes
import dashboardRouter from "./routes/dashboard.js";
import riskRoutes from "./routes/risk.js";
import projectRoutes from "./routes/project.js";
import resourceRoutes from "./routes/resource.js";
import tasksRoutes from "./routes/task.js";
import userRoutes from "./routes/user.js";
import companyRoutes from "./routes/company.js";
import budgetRoutes from "./routes/budget.js";
import activityRoutes from "./routes/activity.js";

const app = express();
const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// =======================
// API ROUTES
// =======================
app.use("/api/dashboard", dashboardRouter);
app.use("/api/risks", riskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/user", userRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/activity", activityRoutes);

// =======================
// USER ROUTES
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

    const user = await prisma.user.findFirst({ where: { name } });

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
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../dist");

  // Serve built React app
  app.use("/", express.static(frontendPath));

  // Catch-all for React Router
  app.get("/*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// =======================
// AUTO-CREATE SUPERADMIN
// =======================
async function ensureSuperAdmin() {
  try {
    const superAdminEmail = "superadmin@example.com";
    const superAdminPassword = "123456";

    let superAdmin = await prisma.user.findFirst({
      where: { role: "superadmin", email: superAdminEmail },
    });

    if (!superAdmin) {
      console.log("⚡ Creating default superadmin...");

      const hashedPassword = await bcrypt.hash(superAdminPassword, SALT_ROUNDS);

      superAdmin = await prisma.user.create({
        data: {
          name: "Super Admin",
          email: superAdminEmail,
          password: hashedPassword,
          role: "superadmin",
          status: "ACTIVE",
          companyId: null,
          permissions: [
            "Manage Companies",
            "Manage Users",
            "Manage Projects",
            "Manage Tasks",
            "Manage Resources",
            "Manage Risks",
            "View All Reports",
          ],
        },
      });

      console.log(`✅ Superadmin created: ${superAdminEmail}`);
    } else {
      console.log("✅ Superadmin already exists");
    }
  } catch (err) {
    console.error("❌ Error ensuring superadmin:", err);
  }
}

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await ensureSuperAdmin();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Serving frontend`);
});
