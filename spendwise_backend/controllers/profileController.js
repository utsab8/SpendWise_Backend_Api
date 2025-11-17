import User from "../models/user.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

// GET USER PROFILE
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        number: user.number,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, number } = req.body;

    // Validate input
    if (!fullName && !number) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields with validation
    if (fullName) {
      const trimmedName = fullName.trim();
      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 2 characters long",
        });
      }
      user.fullName = trimmedName;
    }

    if (number) {
      const trimmedNumber = number.trim();
      if (trimmedNumber.length < 7) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be at least 7 digits",
        });
      }
      user.number = trimmedNumber;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        number: user.number,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// UPLOAD PROFILE PICTURE
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Additional validation
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid image file",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Store old image ID before upload (in case new upload fails)
    const oldImagePublicId = user.profileImagePublicId;

    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, "spendwise/profiles");

      // Update user with new image
      user.profileImage = result.secure_url;
      user.profileImagePublicId = result.public_id;

      await user.save();

      // Delete old image AFTER successful save (to avoid orphaned images)
      if (oldImagePublicId) {
        try {
          await deleteFromCloudinary(oldImagePublicId);
        } catch (deleteError) {
          // Log but don't fail the request
          console.error("Error deleting old image (non-critical):", deleteError);
        }
      }

      res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        profileImage: user.profileImage,
      });
    } catch (uploadError) {
      // Upload failed, don't modify user
      console.error("Cloudinary upload error:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Failed to upload image to cloud storage",
        error: process.env.NODE_ENV === "development" ? uploadError.message : undefined,
      });
    }
  } catch (error) {
    console.error("Upload Profile Picture Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload profile picture",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// DELETE PROFILE PICTURE
export const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.profileImage) {
      return res.status(400).json({
        success: false,
        message: "No profile picture to delete",
      });
    }

    // Store image ID before clearing (in case delete fails)
    const imagePublicId = user.profileImagePublicId;

    // Update user first (safer approach)
    user.profileImage = null;
    user.profileImagePublicId = null;
    await user.save();

    // Delete from Cloudinary (non-critical if it fails)
    if (imagePublicId) {
      try {
        await deleteFromCloudinary(imagePublicId);
      } catch (deleteError) {
        // Image already removed from user, so this is non-critical
        console.error("Error deleting image from Cloudinary (non-critical):", deleteError);
      }
    }

    res.json({
      success: true,
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    console.error("Delete Profile Picture Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete profile picture",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};