// spendwise_backend/routes/authRoutes.js - FIXED VERSION WITH TEST ENDPOINTS
import express from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/authController.js";
import { sendOTP, verifyOTP, resetPassword } from "../controllers/forgotPasswordController.js";
import { protect } from "../middleware/authMiddleware.js";
import { testEmailConnection } from "../utils/emailService.js";

const router = express.Router();

// ✅ Add logging middleware for debugging
router.use((req, res, next) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Auth Route: ${req.method} ${req.path}`);
  console.log(`📦 Body:`, req.body);
  console.log('='.repeat(60));
  next();
});

// ========== PUBLIC ROUTES ==========

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// ========== FORGOT PASSWORD ROUTES ==========

// Send OTP for password reset
router.post("/forgot-password/send-otp", async (req, res, next) => {
  console.log("\n🔥 Send OTP endpoint hit!");
  console.log("📧 Email:", req.body.email);
  next();
}, sendOTP);

// Verify OTP
router.post("/forgot-password/verify-otp", async (req, res, next) => {
  console.log("\n🔥 Verify OTP endpoint hit!");
  console.log("📧 Email:", req.body.email);
  console.log("🔢 OTP:", req.body.otp);
  next();
}, verifyOTP);

// Reset password
router.post("/forgot-password/reset", async (req, res, next) => {
  console.log("\n🔥 Reset Password endpoint hit!");
  console.log("📧 Email:", req.body.email);
  next();
}, resetPassword);

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
      tips: [
        "Make sure EMAIL_USER is set",
        "Make sure EMAIL_APP_PASSWORD is set (Gmail App Password, not regular password)",
        "Ensure 2FA is enabled on Gmail account",
        "Check environment variables in Render Dashboard"
      ]
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
      troubleshooting: {
        issue: "Email sending failed",
        commonCauses: [
          "Gmail credentials not configured",
          "EMAIL_APP_PASSWORD is wrong",
          "2FA not enabled on Gmail",
          "Less secure apps enabled (should use App Password instead)"
        ],
        solution: "Visit https://myaccount.google.com/apppasswords to create App Password"
      }
    });
  }
});

// Health check endpoint
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
      testEmail: "GET /api/auth/test-email",
      testEmailSend: "POST /api/auth/test-email-send"
    }
  });
});

// Test route to verify forgot password routes are working
router.get("/forgot-password/test", (req, res) => {
  res.json({ 
    success: true,
    message: "Forgot password routes are working correctly!",
    timestamp: new Date().toISOString(),
    endpoints: {
      sendOTP: "POST /api/auth/forgot-password/send-otp",
      verifyOTP: "POST /api/auth/forgot-password/verify-otp",
      resetPassword: "POST /api/auth/forgot-password/reset"
    }
  });
});

// ========== PROTECTED ROUTES ==========

// Logout
router.post("/logout", protect, logoutUser);

export default router;