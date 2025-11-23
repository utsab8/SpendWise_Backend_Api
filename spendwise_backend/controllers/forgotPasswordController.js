// controllers/forgotPasswordController.js - CLEAN PRODUCTION VERSION
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
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please sign up first."
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this user
    await OTP.deleteMany({ userId: user._id });

    // Save new OTP
    const otp = new OTP({
      userId: user._id,
      email: email.toLowerCase(),
      otp: otpCode,
      expiresAt: expiresAt
    });
    await otp.save();

    // Send OTP via Email
    let emailSent = false;
    
    try {
      await sendOTPEmail(email, otpCode);
      emailSent = true;
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    // Response
    const response = {
      success: true,
      message: emailSent 
        ? "OTP sent successfully to your email" 
        : "OTP generated but email delivery failed",
      emailSent: emailSent,
      userId: user._id
    };

    // In development, include OTP for testing
    if (process.env.NODE_ENV === "development" && !emailSent) {
      response.otp = otpCode;
      console.log(`[DEV] OTP for ${email}: ${otpCode}`);
    }
    
    res.status(200).json(response);

  } catch (error) {
    console.error("Send OTP Error:", error.message);
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
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    if (otp.length !== 6 || isNaN(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const otpRecord = await OTP.findOne({
      userId: user._id,
      otp: otp,
      verified: false
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const now = new Date();
    if (now > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one"
      });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken: resetToken
    });

  } catch (error) {
    console.error("Verify OTP Error:", error.message);
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
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const otpRecord = await OTP.findOne({
      userId: user._id,
      otp: otp,
      verified: true
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified OTP"
      });
    }

    const now = new Date();
    if (now > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one"
      });
    }

    user.password = newPassword;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password"
    });

  } catch (error) {
    console.error("Reset Password Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};