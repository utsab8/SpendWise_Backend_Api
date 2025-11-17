import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  deleteProfilePicture,
} from "../controllers/profileController.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// ✅ TEST ENDPOINT - No auth required (for debugging)
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Profile routes are working!",
    timestamp: new Date().toISOString(),
  });
});

// All other routes require authentication
router.use(protect);

// GET user profile
router.get("/", getUserProfile);

// UPDATE user profile
router.put("/", updateUserProfile);

// UPLOAD profile picture
router.post("/picture", upload.single('profileImage'), uploadProfilePicture);

// DELETE profile picture
router.delete("/picture", deleteProfilePicture);

export default router;