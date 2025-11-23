import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./spendwise_backend/config/db.js";
import authRoutes from "./spendwise_backend/routes/authRoutes.js";
import budgetRoutes from "./spendwise_backend/routes/budgetRoutes.js";
import transactionRoutes from "./spendwise_backend/routes/transactionRoutes.js";
import profileRoutes from "./spendwise_backend/routes/profileRoutes.js";
import reportsRoutes from "./spendwise_backend/routes/reportsRoutes.js";

dotenv.config();

const app = express();

// CORS configuration - MUST be before routes
app.use(cors({ 
  origin: "*", 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware - MUST be before routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`Headers:`, req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`Body:`, req.body);
  }
  next();
});

// Connect to database
connectDB();

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🎉 SpendWise API is running!",
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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    database: "connected"
  });
});

// Register all routes BEFORE 404 handler
console.log("\n📦 Registering routes...");
console.log("=".repeat(60));

try {
  // Auth routes
  if (authRoutes) {
    app.use("/api/auth", authRoutes);
    console.log("✅ Auth routes registered at /api/auth");
    console.log("   - POST /api/auth/register");
    console.log("   - POST /api/auth/login");
    console.log("   - POST /api/auth/logout");
    console.log("   - POST /api/auth/forgot-password/send-otp");
    console.log("   - POST /api/auth/forgot-password/verify-otp");
    console.log("   - POST /api/auth/forgot-password/reset");
  } else {
    console.error("❌ Auth routes failed to load!");
    process.exit(1);
  }
  
  // Budget routes
  if (budgetRoutes) {
    app.use("/api/budget", budgetRoutes);
    console.log("✅ Budget routes registered at /api/budget");
  }
  
  // Transaction routes
  if (transactionRoutes) {
    app.use("/api/transactions", transactionRoutes);
    console.log("✅ Transaction routes registered at /api/transactions");
  }
  
  // Profile routes
  if (profileRoutes) {
    app.use("/api/profile", profileRoutes);
    console.log("✅ Profile routes registered at /api/profile");
  }
  
  // Reports routes
  if (reportsRoutes) {
    app.use("/api/reports", reportsRoutes);
    console.log("✅ Reports routes registered at /api/reports");
  }
  
  console.log("=".repeat(60));
  console.log("✅ All routes registered successfully!\n");
} catch (error) {
  console.error("❌ Error registering routes:", error.message);
  console.error(error.stack);
  process.exit(1);
}

// 404 handler for undefined routes - MUST be after all route registrations
app.use((req, res) => {
  console.error(`\n❌ ROUTE NOT FOUND`);
  console.error(`Method: ${req.method}`);
  console.error(`Path: ${req.path}`);
  console.error(`Full URL: ${req.originalUrl}`);
  console.error(`Body:`, req.body);
  console.error(`\n`);
  
  res.status(404).json({
    success: false,
    message: "Route not found",
    requestedPath: req.path,
    requestedMethod: req.method,
    fullUrl: req.originalUrl,
    availableEndpoints: {
      root: "GET /",
      health: "GET /health",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        logout: "POST /api/auth/logout",
        sendOTP: "POST /api/auth/forgot-password/send-otp",
        verifyOTP: "POST /api/auth/forgot-password/verify-otp",
        resetPassword: "POST /api/auth/forgot-password/reset"
      },
      budget: "GET/POST/PUT/DELETE /api/budget",
      transactions: "GET/POST/PUT/DELETE /api/transactions",
      profile: "GET/PUT /api/profile",
      reports: "GET /api/reports"
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("\n❌ GLOBAL ERROR HANDLER");
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  console.error("\n");
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 SERVER STARTED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`📝 API Base: http://localhost:${PORT}/api`);
  console.log(`🔐 Auth Endpoint: http://localhost:${PORT}/api/auth`);
  console.log("=".repeat(60) + "\n");
  console.log("💡 Test the server:");
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log(`   curl http://localhost:${PORT}/api/auth/health`);
  console.log("\n");
});

export default app;