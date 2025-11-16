import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./spendwise_backend/config/db.js";
import authRoutes from "./spendwise_backend/routes/authRoutes.js";
import budgetRoutes from "./spendwise_backend/routes/budgetRoutes.js";
import transactionRoutes from "./spendwise_backend/routes/transactionRoutes.js";

dotenv.config();
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/transactions", transactionRoutes); // NEW

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "SpendWise API is running",
    version: "1.1.0",
    endpoints: {
      auth: "/api/auth",
      budget: "/api/budget",
      transactions: "/api/transactions"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));