// index.js - COMPLETE WORKING VERSION
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({ 
  origin: process.env.FRONTEND_URL || "*", 
  credentials: true 
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Simple request logger
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", req.body);
  }
  next();
});

// ============================================================
// DATABASE CONNECTION
// ============================================================
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    await mongoose.connect(mongoUri.trim(), {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected:", mongoose.connection.name);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// ============================================================
// ROUTES
// ============================================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SpendWise API is running!",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      budget: "/api/budget", 
      transactions: "/api/transactions",
      profile: "/api/profile",
      reports: "/api/reports"
    }
  });
});

// Function to load and register routes
async function loadRoutes() {
  try {
    // Check if routes directory exists - handle nested structure
    let routesDir = join(__dirname, 'routes');
    let pathPrefix = './routes/';
    
    // Check if we're in outer folder and need to go into subfolder
    if (!existsSync(routesDir)) {
      const subfolderPath = join(__dirname, 'spendwise_backend', 'routes');
      if (existsSync(subfolderPath)) {
        routesDir = subfolderPath;
        pathPrefix = './spendwise_backend/routes/';
      } else {
        throw new Error('Routes directory not found');
      }
    }
    
    // Check each route file
    const routeFiles = [
      'authRoutes.js',
      'budgetRoutes.js', 
      'transactionRoutes.js',
      'profileRoutes.js',
      'reportsRoutes.js'
    ];
    
    for (const file of routeFiles) {
      const filePath = join(routesDir, file);
      if (!existsSync(filePath)) {
        throw new Error(`Missing route file: ${file}`);
      }
    }
    
    // Import routes dynamically
    const authRoutes = await import(pathPrefix + 'authRoutes.js');
    const budgetRoutes = await import(pathPrefix + 'budgetRoutes.js');
    const transactionRoutes = await import(pathPrefix + 'transactionRoutes.js');
    const profileRoutes = await import(pathPrefix + 'profileRoutes.js');
    const reportsRoutes = await import(pathPrefix + 'reportsRoutes.js');
    
    // Register routes
    app.use("/api/auth", authRoutes.default);
    app.use("/api/budget", budgetRoutes.default);
    app.use("/api/transactions", transactionRoutes.default);
    app.use("/api/profile", profileRoutes.default);
    app.use("/api/reports", reportsRoutes.default);
    
    // Store pathPrefix for later use
    return pathPrefix;
    
  } catch (error) {
    console.error("\n❌ FAILED TO LOAD ROUTES");
    console.error("Error:", error.message);
    throw error;
  }
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  console.error("Stack:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 STARTING SPENDWISE SERVER");
    console.log("=".repeat(60));
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Port: ${PORT}`);
    
    // Load routes first (before database connection)
    const pathPrefix = await loadRoutes();
    
    // Connect to database
    await connectDB();
    
    // Test email service (optional)
    try {
      const emailPath = pathPrefix.includes('spendwise_backend') 
        ? "./spendwise_backend/utils/emailService.js"
        : "./utils/emailService.js";
      const emailService = await import(emailPath);
      await emailService.testEmailConnection();
    } catch (emailError) {
      // Silently handle email service errors
    }
    
    // Start listening
    app.listen(PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log("🎉 SERVER READY");
      console.log("=".repeat(60));
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log("=".repeat(60) + "\n");
    });
    
  } catch (error) {
    console.error("\n❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error closing MongoDB:", error.message);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (err) => {
  console.error("💥 UNHANDLED REJECTION:", err);
  shutdown("Unhandled Rejection");
});

process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err);
  shutdown("Uncaught Exception");
});