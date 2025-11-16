// config/cloudinary.js - SIMPLIFIED VERSION (No multer-storage-cloudinary)
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dorxa2ioq",
  api_key: process.env.CLOUDINARY_API_KEY || "123589234724893",
  api_secret: process.env.CLOUDINARY_API_SECRET || "aWNF5dfE-gLqIsyxB88WygaT82Q",
});

// Use memory storage instead
const storage = multer.memoryStorage();

// Multer upload middleware
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Helper function to upload to Cloudinary
export const uploadToCloudinary = (fileBuffer, folder = "spendwise/profiles") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
          { quality: "auto" },
          { fetch_format: "auto" }
        ],
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const bufferStream = Readable.from(fileBuffer);
    bufferStream.pipe(uploadStream);
  });
};

export { cloudinary };