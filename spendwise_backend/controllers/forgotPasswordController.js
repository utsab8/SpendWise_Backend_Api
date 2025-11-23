import jwt from "jsonwebtoken";
import User from "../models/user.js";
import OTP from "../models/otp.js";
import { sendOTPEmail } from "../utils/emailService.js";

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// SEND OTP
export const sendOTP = async (req, res) => {
  try {
    console.log("📨 Send OTP Request Started");
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

    // Delete any existing OTP for this user
    await OTP.deleteMany({ userId: user._id });
    console.log(`🗑️ Deleted old OTPs for user ${user._id}`);

    // Save new OTP
    const otp = new OTP({
      userId: user._id,
      email: email.toLowerCase(),
      otp: otpCode,
      expiresAt: expiresAt
    });
    await otp.save();
    console.log(`💾 OTP saved successfully`);

    // ✅ Send OTP via Email
    try {
      await sendOTPEmail(email, otpCode);
      console.log(`📧 OTP email sent to ${email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send email:`, emailError);
      // Continue anyway - OTP is saved in DB
      // In production, you might want to return an error here
    }
    
    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      // Remove OTP from response in production for security
      ...(process.env.NODE_ENV === "development" && { otp: otpCode })
    });

  } catch (error) {
    console.error("❌ Send OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// VERIFY OTP
export const verifyOTP = async (req, res) => {
  try {
    console.log("🔍 Verify OTP Request Started");
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
    if (otp.length !== 6) {
      console.log(`❌ Invalid OTP length: ${otp.length}`);
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits"
      });
    }

    console.log(`🔍 Verifying OTP for: ${email}`);

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
    if (new Date() > otpRecord.expiresAt) {
      console.log(`❌ OTP expired at: ${otpRecord.expiresAt}`);
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one"
      });
    }

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

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken: resetToken
    });

  } catch (error) {
    console.error("❌ Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    console.log("🔄 Reset Password Request Started");
    const { email, otp, newPassword } = req.body;

    // Validation
    if (!email || !otp || !newPassword) {
      console.log("❌ Missing required fields");
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
    if (new Date() > otpRecord.expiresAt) {
      console.log(`❌ OTP expired at: ${otpRecord.expiresAt}`);
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one"
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();
    console.log(`✅ Password updated successfully`);

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    console.log(`🗑️ OTP deleted after use`);

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password"
    });

  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};