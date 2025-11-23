// spendwise_backend/controllers/forgotPasswordController.js - COMPLETE UPDATED VERSION
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import OTP from "../models/otp.js";
import { sendOTPEmail } from "../utils/emailService.js";

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========== SEND OTP ==========
export const sendOTP = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📨 SEND OTP REQUEST");
    console.log("=".repeat(60));
    
    const { email } = req.body;

    // Validation
    if (!email) {
      console.log("❌ Email missing");
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    console.log(`🔍 Looking for user with email: ${email}`);

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(404).json({
        success: false,
        message: "No account found with this email"
      });
    }

    console.log(`✅ User found: ${user._id}`);

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`🔢 Generated OTP: ${otpCode}`);
    console.log(`⏱️  Expires at: ${expiresAt}`);

    // Delete any existing OTP for this user
    const deletedCount = await OTP.deleteMany({ userId: user._id });
    console.log(`🗑️  Deleted ${deletedCount.deletedCount} old OTP(s) for user ${user._id}`);

    // Save new OTP
    const otp = new OTP({
      userId: user._id,
      email: email.toLowerCase(),
      otp: otpCode,
      expiresAt: expiresAt
    });
    await otp.save();
    console.log(`💾 OTP saved to database`);

    // Send OTP via Email
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log(`\n📧 Attempting to send OTP email...`);
      await sendOTPEmail(email, otpCode);
      emailSent = true;
      console.log(`✅ OTP email sent successfully to ${email}`);
    } catch (emailErrorInstance) {
      emailError = emailErrorInstance;
      console.error(`❌ Email service error:`, emailErrorInstance.message);
      console.error(`⚠️  OTP is saved in database, but email delivery failed`);
    }
    
    // Response (success even if email fails - OTP is in DB)
    const response = {
      success: true,
      message: emailSent 
        ? "OTP sent successfully to your email" 
        : "OTP generated but email delivery failed. Check your server logs.",
      emailSent: emailSent,
      userId: user._id
    };

    // In development, include OTP for testing
    if (process.env.NODE_ENV === "development") {
      response.otp = otpCode;
      response.debug = {
        expiresIn: "10 minutes",
        canRetry: true
      };
    }

    console.log("\n✅ Send OTP response:", response.message);
    console.log("=".repeat(60) + "\n");
    
    res.status(200).json(response);

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ SEND OTP ERROR");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("=".repeat(60) + "\n");
    
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ========== VERIFY OTP ==========
export const verifyOTP = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 VERIFY OTP REQUEST");
    console.log("=".repeat(60));
    
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      console.log("❌ Email or OTP missing");
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    // Validate OTP format
    if (otp.length !== 6 || isNaN(otp)) {
      console.log(`❌ Invalid OTP format: ${otp}`);
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits"
      });
    }

    console.log(`🔍 Verifying OTP for: ${email}`);
    console.log(`🔢 OTP: ${otp}`);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log(`✅ User found: ${user._id}`);

    // Find OTP record
    const otpRecord = await OTP.findOne({
      userId: user._id,
      otp: otp,
      verified: false
    });

    if (!otpRecord) {
      console.log(`❌ OTP not found or already verified`);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    console.log(`✅ OTP record found`);

    // Check if OTP is expired
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      console.log(`❌ OTP expired at: ${otpRecord.expiresAt}`);
      console.log(`Current time: ${now}`);
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one"
      });
    }

    console.log(`⏱️  OTP is still valid. Expires in: ${Math.round((otpRecord.expiresAt - now) / 1000)} seconds`);

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();
    console.log(`✅ OTP verified and marked as used`);

    // Generate a temporary reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    console.log(`✅ Reset token generated`);
    console.log("=".repeat(60) + "\n");

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken: resetToken
    });

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ VERIFY OTP ERROR");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("=".repeat(60) + "\n");
    
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ========== RESET PASSWORD ==========
export const resetPassword = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 RESET PASSWORD REQUEST");
    console.log("=".repeat(60));
    
    const { email, otp, newPassword } = req.body;

    // Validation
    if (!email || !otp || !newPassword) {
      console.log("❌ Missing required fields");
      console.log("Email:", !!email);
      console.log("OTP:", !!otp);
      console.log("Password:", !!newPassword);
      
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required"
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      console.log(`❌ Password too short: ${newPassword.length} chars`);
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    console.log(`🔍 Resetting password for: ${email}`);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log(`✅ User found: ${user._id}`);

    // Verify OTP is verified
    const otpRecord = await OTP.findOne({
      userId: user._id,
      otp: otp,
      verified: true
    });

    if (!otpRecord) {
      console.log(`❌ OTP not found or not verified`);
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified OTP"
      });
    }

    console.log(`✅ OTP verified`);

    // Check if OTP is expired
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      console.log(`❌ OTP expired at: ${otpRecord.expiresAt}`);
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one"
      });
    }

    // Update password (pre-save hook will hash it)
    console.log(`🔐 Updating password...`);
    user.password = newPassword;
    await user.save();
    console.log(`✅ Password updated successfully`);

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    console.log(`🗑️  OTP deleted after successful password reset`);

    console.log("=".repeat(60));
    console.log("✅ PASSWORD RESET SUCCESSFUL");
    console.log("=".repeat(60) + "\n");

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password"
    });

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ RESET PASSWORD ERROR");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("=".repeat(60) + "\n");
    
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};