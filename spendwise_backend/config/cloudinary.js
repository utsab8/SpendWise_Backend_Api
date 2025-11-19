// config/cloudinary.js - ACCEPT ALL IMAGE FORMATS
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ ERROR: Cloudinary credentials not found in environment variables');
  console.error('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
}

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log('📄 File upload attempt:', file.mimetype, file.originalname);
    
    // Accept ALL image formats (more permissive)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      'image/x-icon',
      'image/vnd.microsoft.icon'
    ];
    
    // Check if mimetype starts with 'image/' OR is in allowed list
    if (file.mimetype.startsWith('image/') || allowedMimeTypes.includes(file.mimetype)) {
      console.log('✅ Image accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ File rejected - not an image:', file.mimetype);
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

export const uploadToCloudinary = (fileBuffer, folder = "spendwise/profiles") => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      return reject(new Error('Invalid file buffer'));
    }

    if (fileBuffer.length > 5 * 1024 * 1024) {
      return reject(new Error('File size exceeds 5MB limit'));
    }

    console.log('☁️ Uploading to Cloudinary...');
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
          { quality: "auto:good" },
          { fetch_format: "auto" }
        ],
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        } else if (!result) {
          reject(new Error('Upload failed: No result from Cloudinary'));
        } else {
          console.log('✅ Image uploaded successfully:', result.public_id);
          resolve(result);
        }
      }
    );

    try {
      const bufferStream = Readable.from(fileBuffer);
      bufferStream.pipe(uploadStream);
    } catch (error) {
      reject(new Error(`Stream error: ${error.message}`));
    }
  });
};

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