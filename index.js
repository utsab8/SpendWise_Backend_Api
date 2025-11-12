import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./spendwise_backend/config/db.js";
import authRoutes from "./spendwise_backend/routes/authRoutes.js";

dotenv.config();
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));