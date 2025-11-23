import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import connectDB from "./spendwise_backend/config/db.js";
import authRoutes from "./spendwise_backend/routes/authRoutes.js";
import budgetRoutes from "./spendwise_backend/routes/budgetRoutes.js";
import transactionRoutes from "./spendwise_backend/routes/transactionRoutes.js";
import profileRoutes from "./spendwise_backend/routes/profileRoutes.js";
import reportsRoutes from "./spendwise_backend/routes/reportsRoutes.js";

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('📂 Loaded .env file (development mode)');
} else {
  console.log('☁️  Using environment variables from hosting platform');
}

const app = express();

// Connect to MongoDB
connectDB();

// CORS Configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📥 ${new Date().toISOString()}`);
  console.log(`${req.method} ${req.path}`);
  console.log(`Body:`, req.body);
  console.log('='.repeat(60));
  next();
});

// ✅ CHECK ENVIRONMENT VARIABLES ON STARTUP
console.log('\n🔍 Checking Email Configuration:');
console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? '✅ SET' : '❌ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ SET' : '❌ NOT SET');

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/reports", reportsRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "SpendWise API is running",
    version: "2.0.0-production",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      database: '✅ MongoDB Connected',
      emailService: process.env.EMAIL_USER ? '✅ Configured' : '❌ Not Configured',
      authentication: '✅ Active',
      forgotPassword: '✅ Active'
    },
    endpoints: {
      auth: "/api/auth",
      authRoutes: [
        "POST /api/auth/register",
        "POST /api/auth/login",
        "POST /api/auth/logout",
        "POST /api/auth/forgot-password/send-otp",
        "POST /api/auth/forgot-password/verify-otp",
        "POST /api/auth/forgot-password/reset"
      ],
      budget: "/api/budget",
      transactions: "/api/transactions",
      profile: "/api/profile",
      reports: "/api/reports"
    }
  });
});

// Multer error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  
  next(err);
});

// General error handling middleware
app.use((err, req, res, next) => {
  console.error("\n" + "=".repeat(60));
  console.error("❌ ERROR OCCURRED");
  console.error("Time:", new Date().toISOString());
  console.error("Path:", req.path);
  console.error("Method:", req.method);
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  console.error("=".repeat(60) + "\n");
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`\n❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("✅ SERVER STARTED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 API URL: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/`);
  console.log("=".repeat(60) + "\n");
});