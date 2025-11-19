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

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Profile routes are working!",
    timestamp: new Date().toISOString(),
  });
});

router.use(protect);

router.get("/", getUserProfile);
router.put("/", updateUserProfile);

// Updated picture upload with error handling
router.post("/picture", (req, res, next) => {
  upload.single('profileImage')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
      });
    }
    uploadProfilePicture(req, res, next);
  });
});

router.delete("/picture", deleteProfilePicture);

export default router;