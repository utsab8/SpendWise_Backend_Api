import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import connectDB from "./spendwise_backend/config/db.js";
import authRoutes from "./spendwise_backend/routes/authRoutes.js";
import budgetRoutes from "./spendwise_backend/routes/budgetRoutes.js";
import transactionRoutes from "./spendwise_backend/routes/transactionRoutes.js";
import profileRoutes from "./spendwise_backend/routes/profileRoutes.js";

// ✅ Only load .env in development (local), not in production (Render)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('📁 Loaded .env file (development mode)');
} else {
  console.log('☁️  Using environment variables from hosting platform');
}

const app = express();

// Connect to MongoDB
connectDB();

// ✅ CORS Configuration - Allow all origins for development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/profile", profileRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "SpendWise API is running",
    version: "1.3.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: "/api/auth",
      budget: "/api/budget",
      transactions: "/api/transactions",
      profile: "/api/profile",
    }
  });
});

// ✅ Multer error handling middleware (BEFORE general error handler)
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
  
  // Handle custom file filter errors
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  
  next(err);
});

// ✅ General error handling middleware with better logging
app.use((err, req, res, next) => {
  console.error("=== ERROR ===");
  console.error("Time:", new Date().toISOString());
  console.error("Path:", req.path);
  console.error("Method:", req.method);
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  console.error("============");
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 404 handler - MUST be last
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/`);
});