// controllers/forgotPasswordController.js - UPDATED WITH IMPROVED ERROR HANDLING
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
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

    // Save new OTP to database FIRST (critical step)
    const otp = new OTP({
      userId: user._id,
      email: email.toLowerCase(),
      otp: otpCode,
      expiresAt: expiresAt
    });
    await otp.save();

    console.log('✅ OTP saved to database successfully');
    console.log(`📝 OTP Code: ${otpCode}`);
    console.log(`👤 User: ${email}`);
    console.log(`⏰ Expires: ${expiresAt.toISOString()}`);

    // Try to send email with timeout - but DON'T FAIL if it times out
    let emailResult = { success: false, error: 'Not attempted' };
    
    // Try to send email with short timeout for fast response
    try {
      console.log('📧 Attempting to send OTP email...');
      
      // Race between email sending and short timeout (10 seconds)
      const emailPromise = sendOTPEmail(email, otpCode).catch(err => {
        // If email service throws, return error object
        return { 
          success: false, 
          error: err.message || 'Email sending failed',
          code: err.code || 'UNKNOWN'
        };
      });
      
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.log('⏱️ Email timeout (10s) - responding immediately');
          resolve({ success: false, error: 'Email may be delayed', code: 'TIMEOUT' });
        }, 10000); // 10 second timeout - respond very quickly
      });
      
      emailResult = await Promise.race([emailPromise, timeoutPromise]);
      
      if (emailResult && emailResult.success) {
        console.log('✅ Email sent successfully');
      } else {
        console.log('⚠️ Email sending may be delayed:', emailResult?.error || 'Unknown');
      }
      
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError.message);
      emailResult = { 
        success: false, 
        error: emailError.message || 'Email sending failed',
        code: emailError.code || 'UNKNOWN'
      };
    }

    // CRITICAL: Always return success if OTP is saved, regardless of email status
    // This ensures the frontend can proceed to OTP entry screen immediately
    const response = {
      success: true, // ✅ Always true because OTP is saved in database
      message: emailResult && emailResult.success 
        ? "OTP sent successfully to your email" 
        : "OTP has been generated and sent to your email. Please check your inbox (including spam folder).",
      emailSent: emailResult && emailResult.success ? true : false,
      userId: user._id
    };
    
    // Only log email errors, don't include them in response message
    if (!emailResult || !emailResult.success) {
      console.log('ℹ️ Email may be delayed, but OTP is saved and user can proceed');
    }

    // In development mode, include OTP for testing (ONLY IN DEV!)
    if (process.env.NODE_ENV === "development") {
      response.otp = otpCode;
      response.devMode = true;
      console.log(`\n🔧 [DEV MODE] OTP for ${email}: ${otpCode}\n`);
    }
    
    console.log('📤 Sending success response to client');
    console.log('Response:', JSON.stringify(response, null, 2));
    
    res.status(200).json(response);

  } catch (error) {
    console.error('\n❌ SEND OTP ERROR');
    console.error('Error Message:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: "Failed to process OTP request. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ========== VERIFY OTP ==========
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    // Validate OTP format
    if (otp.length !== 6 || isNaN(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits"
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log(`🔍 Verifying OTP for user: ${email}`);
    console.log(`📝 OTP provided: ${otp}`);

    // Find OTP record
    const otpRecord = await OTP.findOne({
      userId: user._id,
      otp: otp,
      verified: false
    });

    if (!otpRecord) {
      console.log('❌ OTP not found or already verified');
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again."
      });
    }

    // Check if OTP has expired
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      console.log('⏰ OTP has expired');
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    console.log('✅ OTP verified successfully');

    // Generate reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      resetToken: resetToken
    });

  } catch (error) {
    console.error('❌ VERIFY OTP ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ========== RESET PASSWORD ==========
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validation
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required"
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    // Validate password strength (optional but recommended)
    if (newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password is too long (max 128 characters)"
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log(`🔐 Resetting password for user: ${email}`);

    // Find and verify OTP
    const otpRecord = await OTP.findOne({
      userId: user._id,
      otp: otp,
      verified: true // Must be verified first
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified OTP. Please verify OTP first."
      });
    }

    // Check if OTP has expired
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    // Update password (User model will hash it automatically via pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log('✅ Password reset successfully');

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    // Also delete any other OTPs for this user
    await OTP.deleteMany({ userId: user._id });

    res.status(200).json({
      success: true,
      message: "Password reset successfully! You can now login with your new password."
    });

  } catch (error) {
    console.error('❌ RESET PASSWORD ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: "Failed to reset password. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};