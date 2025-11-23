// authController.js - FIXED VERSION
import jwt from "jsonwebtoken";
import User from "../models/user.js";

// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { fullName, email, number, password } = req.body;

    // Validation
    if (!fullName || !email || !number || !password) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
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

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "User already exists with this email" 
      });
    }

    // Create new user - DON'T hash password here, let the model do it!
    const user = new User({ 
      fullName: fullName.trim(), 
      email: email.toLowerCase().trim(), 
      number: number.trim(), 
      password // ✅ Let User model's pre-save hook hash it
    });
    
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    res.status(201).json({ 
      success: true,
      message: "User registered successfully",
      token,
      user: { 
        _id: user._id,
        fullName: user.fullName, 
        email: user.email, 
        number: user.number,
        profileImage: user.profileImage,
      }
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Registration failed", 
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required" 
      });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "Invalid email or password" // ✅ Don't reveal which is wrong
      });
    }

    // Compare password using model method
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    res.json({ 
      success: true,
      message: "Login successful", 
      token, 
      user: { 
        _id: user._id,
        fullName: user.fullName, 
        email: user.email, 
        number: user.number,
        profileImage: user.profileImage,
      } 
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Login failed", 
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// LOGOUT USER (Optional - for future token blacklisting)
export const logoutUser = async (req, res) => {
  try {
    // In a simple JWT setup, logout is handled client-side by removing the token
    // If you implement token blacklisting in the future, add logic here
    
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};