// spendwise_backend/controllers/forgotPasswordController.js - COMPLETE ENHANCED VERSION
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
    console.log("\n" + "=".repeat(70));
    console.log("🔥 SEND OTP REQUEST STARTED");
    console.log("=".repeat(70));
    console.log("⏰ Timestamp:", new Date().toISOString());
    
    const { email } = req.body;

    // Validation
    if (!email) {
      console.log("❌ FAILED: Email missing from request body");
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    console.log(`📧 Email received: ${email}`);
    console.log(`🔍 Searching for user in database...`);

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ USER NOT FOUND: ${email}`);
      console.log(`💡 This email is not registered in the database`);
      console.log(`💡 User must register first before using forgot password`);
      console.log("=".repeat(70) + "\n");
      return res.status(404).json({
        success: false,
        message: "No account found with this email"
      });
    }

    console.log(`✅ USER FOUND in database`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName}`);

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`\n🔐 OTP GENERATED`);
    console.log(`   OTP Code: ${otpCode}`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    console.log(`   Valid for: 10 minutes`);

    // Delete any existing OTP for this user
    const deletedCount = await OTP.deleteMany({ userId: user._id });
    console.log(`\n🗑️  Deleted ${deletedCount.deletedCount} old OTP(s) for this user`);

    // Save new OTP
    const otp = new OTP({
      userId: user._id,
      email: email.toLowerCase(),
      otp: otpCode,
      expiresAt: expiresAt
    });
    await otp.save();
    console.log(`💾 New OTP saved to database`);

    // Send OTP via Email
    console.log(`\n📧 ATTEMPTING TO SEND EMAIL...`);
    console.log(`   From: ${process.env.EMAIL_USER || 'NOT SET'}`);
    console.log(`   To: ${email}`);
    console.log(`   OTP: ${otpCode}`);
    
    let emailSent = false;
    let emailError = null;
    
    try {
      await sendOTPEmail(email, otpCode);
      emailSent = true;
      console.log(`\n✅ ✅ ✅ EMAIL SENT SUCCESSFULLY! ✅ ✅ ✅`);
      console.log(`📬 Email delivered to: ${email}`);
      console.log(`📱 User should receive it within 30 seconds`);
      console.log(`💡 Check inbox or spam folder`);
    } catch (emailErrorInstance) {
      emailError = emailErrorInstance;
      console.error(`\n❌ ❌ ❌ EMAIL SENDING FAILED! ❌ ❌ ❌`);
      console.error(`Error Type: ${emailErrorInstance.name}`);
      console.error(`Error Message: ${emailErrorInstance.message}`);
      console.error(`Error Code: ${emailErrorInstance.code || 'N/A'}`);
      
      if (emailErrorInstance.message.includes('Invalid login') || 
          emailErrorInstance.code === 'EAUTH') {
        console.error(`\n💡 AUTHENTICATION ERROR`);
        console.error(`   Problem: Gmail credentials are incorrect`);
        console.error(`   Solution: Check EMAIL_APP_PASSWORD in environment variables`);
        console.error(`   Visit: https://myaccount.google.com/apppasswords`);
      } else if (emailErrorInstance.message.includes('ECONNREFUSED') || 
                 emailErrorInstance.message.includes('ETIMEDOUT')) {
        console.error(`\n💡 CONNECTION ERROR`);
        console.error(`   Problem: Cannot connect to Gmail SMTP server`);
        console.error(`   Solution: Check internet connection or firewall settings`);
      } else if (emailErrorInstance.message.includes('Greeting never received')) {
        console.error(`\n💡 SMTP CONNECTION ERROR`);
        console.error(`   Problem: SMTP server not responding`);
        console.error(`   Solution: Check if port 587 is blocked`);
      }
      
      console.error(`\n⚠️  OTP is saved in database, but email delivery failed`);
      console.error(`⚠️  User can still use OTP if they check server logs (dev mode)`);
    }
    
    // Response
    const response = {
      success: true,
      message: emailSent 
        ? "OTP sent successfully to your email" 
        : "OTP generated but email delivery failed. Check server logs.",
      emailSent: emailSent,
      userId: user._id
    };

    // In development, include OTP for testing
    if (process.env.NODE_ENV === "development" || !emailSent) {
      response.otp = otpCode;
      console.log(`\n🔓 DEVELOPMENT MODE: Including OTP in response`);
      console.log(`   Clients can use this OTP for testing`);
    }

    console.log(`\n📤 SENDING RESPONSE TO CLIENT`);
    console.log(`   Success: ${response.success}`);
    console.log(`   Email Sent: ${response.emailSent}`);
    console.log(`   Message: ${response.message}`);
    if (response.otp) {
      console.log(`   OTP Included: ${response.otp}`);
    }
    console.log("=".repeat(70));
    console.log("✅ SEND OTP REQUEST COMPLETED");
    console.log("=".repeat(70) + "\n");
    
    res.status(200).json(response);

  } catch (error) {
    console.error("\n" + "=".repeat(70));
    console.error("💥 SEND OTP ERROR - EXCEPTION CAUGHT");
    console.error("=".repeat(70));
    console.error("Error Type:", error.name);
    console.error("Error Message:", error.message);
    console.error("Stack Trace:", error.stack);
    console.error("=".repeat(70) + "\n");
    
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
    console.log("\n" + "=".repeat(70));
    console.log("🔐 VERIFY OTP REQUEST STARTED");
    console.log("=".repeat(70));
    console.log("⏰ Timestamp:", new Date().toISOString());
    
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      console.log("❌ FAILED: Email or OTP missing");
      console.log(`   Email provided: ${!!email}`);
      console.log(`   OTP provided: ${!!otp}`);
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    // Validate OTP format
    if (otp.length !== 6 || isNaN(otp)) {
      console.log(`❌ FAILED: Invalid OTP format`);
      console.log(`   OTP received: ${otp}`);
      console.log(`   OTP length: ${otp.length}`);
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits"
      });
    }

    console.log(`📧 Email: ${email}`);
    console.log(`🔢 OTP: ${otp}`);
    console.log(`🔍 Searching for user...`);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ USER NOT FOUND: ${email}`);
      console.log("=".repeat(70) + "\n");
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log(`✅ User found: ${user._id}`);
    console.log(`🔍 Searching for OTP record...`);

    // Find OTP record
    const otpRecord = await OTP.findOne({
      userId: user._id,
      otp: otp,
      verified: false
    });

    if (!otpRecord) {
      console.log(`❌ OTP NOT FOUND or ALREADY VERIFIED`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   OTP: ${otp}`);
      console.log(`💡 Possible reasons:`);
      console.log(`   - OTP is incorrect`);
      console.log(`   - OTP was already used`);
      console.log(`   - OTP has expired and was deleted`);
      console.log("=".repeat(70) + "\n");
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    console.log(`✅ OTP record found`);
    console.log(`   Created at: ${otpRecord.createdAt}`);
    console.log(`   Expires at: ${otpRecord.expiresAt}`);

    // Check if OTP is expired
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      const expiredMinutes = Math.round((now - otpRecord.expiresAt) / 1000 / 60);
      console.log(`❌ OTP EXPIRED`);
      console.log(`   Current time: ${now.toISOString()}`);
      console.log(`   Expired at: ${otpRecord.expiresAt.toISOString()}`);
      console.log(`   Expired ${expiredMinutes} minute(s) ago`);
      
      await OTP.deleteOne({ _id: otpRecord._id });
      console.log(`🗑️  Expired OTP deleted from database`);
      console.log("=".repeat(70) + "\n");
      
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one"
      });
    }

    const remainingSeconds = Math.round((otpRecord.expiresAt - now) / 1000);
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    console.log(`✅ OTP is still valid`);
    console.log(`   Remaining time: ${remainingMinutes}m ${remainingSeconds % 60}s`);

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
    console.log(`   Valid for: 15 minutes`);
    console.log(`\n📤 SENDING RESPONSE TO CLIENT`);
    console.log("=".repeat(70));
    console.log("✅ VERIFY OTP REQUEST COMPLETED");
    console.log("=".repeat(70) + "\n");

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken: resetToken
    });

  } catch (error) {
    console.error("\n" + "=".repeat(70));
    console.error("💥 VERIFY OTP ERROR - EXCEPTION CAUGHT");
    console.error("=".repeat(70));
    console.error("Error Type:", error.name);
    console.error("Error Message:", error.message);
    console.error("Stack Trace:", error.stack);
    console.error("=".repeat(70) + "\n");
    
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
    console.log("\n" + "=".repeat(70));
    console.log("🔄 RESET PASSWORD REQUEST STARTED");
    console.log("=".repeat(70));
    console.log("⏰ Timestamp:", new Date().toISOString());
    
    const { email, otp, newPassword } = req.body;

    // Validation
    if (!email || !otp || !newPassword) {
      console.log("❌ FAILED: Missing required fields");
      console.log(`   Email provided: ${!!email}`);
      console.log(`   OTP provided: ${!!otp}`);
      console.log(`   New password provided: ${!!newPassword}`);
      
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required"
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      console.log(`❌ FAILED: Password too short (${newPassword.length} chars)`);
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    console.log(`📧 Email: ${email}`);
    console.log(`🔢 OTP: ${otp}`);
    console.log(`🔐 New password length: ${newPassword.length} chars`);
    console.log(`🔍 Searching for user...`);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ USER NOT FOUND: ${email}`);
      console.log("=".repeat(70) + "\n");
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log(`✅ User found: ${user._id}`);
    console.log(`🔍 Verifying OTP...`);

    // Verify OTP is verified
    const otpRecord = await OTP.findOne({
      userId: user._id,
      otp: otp,
      verified: true
    });

    if (!otpRecord) {
      console.log(`❌ OTP NOT FOUND or NOT VERIFIED`);
      console.log(`💡 User must verify OTP first before resetting password`);
      console.log("=".repeat(70) + "\n");
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified OTP"
      });
    }

    console.log(`✅ OTP verified`);

    // Check if OTP is expired
    const now = new Date();
    if (now > otpRecord.expiresAt) {
      console.log(`❌ OTP EXPIRED`);
      console.log(`   Current time: ${now.toISOString()}`);
      console.log(`   Expired at: ${otpRecord.expiresAt.toISOString()}`);
      
      await OTP.deleteOne({ _id: otpRecord._id });
      console.log(`🗑️  Expired OTP deleted`);
      console.log("=".repeat(70) + "\n");
      
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one"
      });
    }

    // Update password (pre-save hook will hash it)
    console.log(`🔐 Updating password...`);
    const oldPasswordHash = user.password;
    user.password = newPassword;
    await user.save();
    
    console.log(`✅ Password updated successfully`);
    console.log(`   Old hash: ${oldPasswordHash.substring(0, 20)}...`);
    console.log(`   New hash: ${user.password.substring(0, 20)}...`);

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    console.log(`🗑️  Used OTP deleted from database`);

    console.log("\n📤 SENDING SUCCESS RESPONSE TO CLIENT");
    console.log("=".repeat(70));
    console.log("✅ ✅ ✅ PASSWORD RESET SUCCESSFUL ✅ ✅ ✅");
    console.log("=".repeat(70));
    console.log(`👤 User: ${user.email}`);
    console.log(`🔐 Can now login with new password`);
    console.log("=".repeat(70) + "\n");

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password"
    });

  } catch (error) {
    console.error("\n" + "=".repeat(70));
    console.error("💥 RESET PASSWORD ERROR - EXCEPTION CAUGHT");
    console.error("=".repeat(70));
    console.error("Error Type:", error.name);
    console.error("Error Message:", error.message);
    console.error("Stack Trace:", error.stack);
    console.error("=".repeat(70) + "\n");
    
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};