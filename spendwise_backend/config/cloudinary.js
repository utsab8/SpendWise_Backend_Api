// config/cloudinary.js - ALLOW ALL IMAGE TYPES
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

// ✅ Configure Cloudinary - NO HARDCODED DEFAULTS
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate Cloudinary configuration on startup
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ ERROR: Cloudinary credentials not found in environment variables');
  console.error('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
}

// Use memory storage
const storage = multer.memoryStorage();

// Multer upload middleware - ALLOW ALL IMAGE TYPES
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only allow 1 file
  },
  fileFilter: (req, file, cb) => {
    // ✅ Check if file is an image (any image type)
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Helper function to upload to Cloudinary - ALLOW ALL IMAGE FORMATS
export const uploadToCloudinary = (fileBuffer, folder = "spendwise/profiles") => {
  return new Promise((resolve, reject) => {
    // Validate buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      return reject(new Error('Invalid file buffer'));
    }

    // Check file size
    if (fileBuffer.length > 5 * 1024 * 1024) {
      return reject(new Error('File size exceeds 5MB limit'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
          { quality: "auto:good" }, // Better quality
          { fetch_format: "auto" }
        ],
        // ✅ Allow all image formats - Cloudinary will handle conversion
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        } else if (!result) {
          reject(new Error('Upload failed: No result from Cloudinary'));
        } else {
          console.log('✅ Image uploaded successfully:', result.public_id);
          resolve(result);
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    try {
      const bufferStream = Readable.from(fileBuffer);
      bufferStream.pipe(uploadStream);
    } catch (error) {
      reject(new Error(`Stream error: ${error.message}`));
    }
  });
};

// Helper function to safely delete from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    throw new Error('No public ID provided');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log('✅ Image deleted successfully:', publicId);
      return { success: true };
    } else if (result.result === 'not found') {
      console.log('⚠️ Image not found in Cloudinary:', publicId);
      return { success: true, warning: 'Image not found' };
    } else {
      console.error('❌ Failed to delete image:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
};

export { cloudinary };