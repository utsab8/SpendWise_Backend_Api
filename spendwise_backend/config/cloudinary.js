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
    fileSize: 10 * 1024 * 1024, // Increased to 10MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log('📄 File upload attempt:', {
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size
    });
    
    // EXTREMELY PERMISSIVE - Accept ANY image type and common formats
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
      'image/vnd.microsoft.icon',
      'application/octet-stream', // Fallback for unknown types
      'image/*' // Catch-all for any image type
    ];
    
    // Check if it's ANY image type OR in allowed list OR has image extension
    const isImage = file.mimetype.startsWith('image/') || 
                   allowedMimeTypes.includes(file.mimetype) ||
                   allowedMimeTypes.some(type => type.includes(file.mimetype)) ||
                   /\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/i.test(file.originalname);

    if (isImage) {
      console.log('✅ Image accepted:', file.mimetype, file.originalname);
      cb(null, true);
    } else {
      console.log('❌ File rejected - not an image:', file.mimetype, file.originalname);
      cb(new Error('Only image files are allowed (JPG, PNG, GIF, WEBP, BMP, TIFF, SVG)!'), false);
    }
  },
});

export const uploadToCloudinary = (fileBuffer, folder = "spendwise/profiles") => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      return reject(new Error('Invalid file buffer'));
    }

    if (fileBuffer.length > 10 * 1024 * 1024) {
      return reject(new Error('File size exceeds 10MB limit'));
    }

    console.log('☁️ Uploading to Cloudinary...');
    console.log('File size:', fileBuffer.length, 'bytes');
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "auto" },
          { quality: "auto:good" },
          { fetch_format: "auto" }
        ],
        resource_type: "image",
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'],
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        } else if (!result) {
          reject(new Error('Upload failed: No result from Cloudinary'));
        } else {
          console.log('✅ Image uploaded successfully:', result.public_id);
          console.log('Format:', result.format, 'Size:', result.bytes, 'bytes');
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