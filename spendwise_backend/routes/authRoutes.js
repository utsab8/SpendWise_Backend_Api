import express from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/authController.js";
import { sendOTP, verifyOTP, resetPassword } from "../controllers/forgotPasswordController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Add logging middleware for debugging
router.use((req, res, next) => {
  console.log(`🔍 Auth Route: ${req.method} ${req.path}`);
  console.log(`📦 Body:`, req.body);
  next();
});

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// ✅ Forgot Password routes with logging
router.post("/forgot-password/send-otp", (req, res, next) => {
  console.log("🔥 Send OTP endpoint hit!");
  console.log("📧 Email:", req.body.email);
  next();
}, sendOTP);

router.post("/forgot-password/verify-otp", (req, res, next) => {
  console.log("🔥 Verify OTP endpoint hit!");
  console.log("📧 Email:", req.body.email);
  console.log("🔢 OTP:", req.body.otp);
  next();
}, verifyOTP);

router.post("/forgot-password/reset", (req, res, next) => {
  console.log("🔥 Reset Password endpoint hit!");
  console.log("📧 Email:", req.body.email);
  next();
}, resetPassword);

// Test route to verify forgot password routes are working
router.get("/forgot-password/test", (req, res) => {
  res.json({ 
    success: true,
    message: "Forgot password routes are working correctly!",
    timestamp: new Date().toISOString()
  });
});

// Protected route
router.post("/logout", protect, logoutUser);

export default router;