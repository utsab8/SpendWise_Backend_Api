// routes/authRoutes.js - FIXED VERSION WITH PROPER ROUTE REGISTRATION
import express from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/authController.js";
import { sendOTP, verifyOTP, resetPassword } from "../controllers/forgotPasswordController.js";
import { protect } from "../middleware/authMiddleware.js";
import { testEmailConnection } from "../utils/emailService.js";

const router = express.Router();

// Basic logging middleware
router.use((req, res, next) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔥 INCOMING AUTH REQUEST");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log(`Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  if (Object.keys(req.body).length > 0) {
    console.log(`Body:`, JSON.stringify(req.body, null, 2));
  }
  console.log("=".repeat(60));
  next();
});

// ========== PUBLIC ROUTES ==========

// Health check - should be FIRST
router.get("/health", (req, res) => {
  res.json({ 
    success: true,
    message: "Auth service is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      sendOTP: "POST /api/auth/forgot-password/send-otp",
      verifyOTP: "POST /api/auth/forgot-password/verify-otp",
      resetPassword: "POST /api/auth/forgot-password/reset",
    }
  });
});

// Register - CRITICAL: This must match /api/auth/register
router.post("/register", (req, res, next) => {
  console.log("✅ REGISTER route hit!");
  console.log("Body received:", req.body);
  next();
}, registerUser);

// Login
router.post("/login", (req, res, next) => {
  console.log("✅ LOGIN route hit!");
  console.log("Body received:", req.body);
  next();
}, loginUser);

// ========== FORGOT PASSWORD ROUTES ==========

// Send OTP for password reset
router.post("/forgot-password/send-otp", (req, res, next) => {
  console.log("✅ SEND OTP route hit!");
  next();
}, sendOTP);

// Verify OTP
router.post("/forgot-password/verify-otp", (req, res, next) => {
  console.log("✅ VERIFY OTP route hit!");
  next();
}, verifyOTP);

// Reset password
router.post("/forgot-password/reset", (req, res, next) => {
  console.log("✅ RESET PASSWORD route hit!");
  next();
}, resetPassword);

// Test forgot password routes
router.get("/forgot-password/test", (req, res) => {
  res.json({ 
    success: true,
    message: "Forgot password routes are working correctly!",
    timestamp: new Date().toISOString(),
  });
});

// ========== EMAIL SERVICE TESTING ROUTES ==========

// Test email connection
router.get("/test-email", async (req, res) => {
  try {
    console.log("\n🧪 Testing email connection...");
    const result = await testEmailConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
    });
  }
});

// Test email by sending to user email
router.post("/test-email-send", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    console.log(`\n📧 Sending test email to: ${email}`);
    
    const { sendOTPEmail } = await import("../utils/emailService.js");
    const result = await sendOTPEmail(email, "123456");
    
    res.json({ 
      success: true, 
      message: "Test email sent successfully!",
      result 
    });
  } catch (error) {
    console.error("❌ Test email failed:", error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
    });
  }
});

// ========== PROTECTED ROUTES ==========

// Logout
router.post("/logout", protect, logoutUser);

export default router;