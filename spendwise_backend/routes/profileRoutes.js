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

// Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Profile routes are working!",
    timestamp: new Date().toISOString(),
  });
});

// Protected routes
router.use(protect);

router.get("/", getUserProfile);
router.put("/", updateUserProfile);

// Enhanced picture upload with detailed error handling
router.post("/picture", (req, res, next) => {
  console.log('\n📸 Picture upload request received');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('content-type'));
  
  // Use multer middleware
  upload.single('profileImage')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      
      // Handle different types of multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name. Use "profileImage" as the field name.',
        });
      }
      
      // Handle file type error
      if (err.message && err.message.includes('Only image files')) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Only image files are allowed (JPEG, PNG, GIF, WebP, etc.)',
        });
      }
      
      // Generic error
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
      });
    }
    
    // Check if file exists
    if (!req.file) {
      console.log('⚠️ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an image file.',
      });
    }
    
    console.log('✅ File passed multer validation');
    console.log('File details:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
    
    // Continue to controller
    uploadProfilePicture(req, res, next);
  });
});

router.delete("/picture", deleteProfilePicture);

export default router;