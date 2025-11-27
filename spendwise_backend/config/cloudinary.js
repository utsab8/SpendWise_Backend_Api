import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Enhanced logging for debugging
    console.log('📁 File filter check:');
    console.log('  - Original name:', file.originalname);
    console.log('  - MIME type:', file.mimetype);
    console.log('  - Field name:', file.fieldname);
    console.log('  - Size:', file.size);

    // List of allowed MIME types (expanded)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/x-icon',
      'image/heic',
      'image/heif'
    ];

    // Check file extension as backup
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico', '.heic', '.heif'];
    const fileExtension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];

    // Accept if MIME type matches OR if it starts with 'image/' OR if extension matches
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype.toLowerCase());
    const isImageMimeType = file.mimetype.toLowerCase().startsWith('image/');
    const isValidExtension = fileExtension && allowedExtensions.includes(fileExtension);

    if (isValidMimeType || isImageMimeType || isValidExtension) {
      console.log('✅ File accepted');
      cb(null, true);
    } else {
      console.log('❌ File rejected - Invalid type');
      console.log('  - MIME type:', file.mimetype);
      console.log('  - Extension:', fileExtension);
      cb(new Error(`Only image files are allowed! Received: ${file.mimetype}`), false);
    }
  },
});

export const uploadToCloudinary = (fileBuffer, folder = "spendwise/profiles") => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      return reject(new Error('Invalid file buffer'));
    }

    console.log('☁️ Starting Cloudinary upload...');
    console.log('  - Buffer size:', fileBuffer.length, 'bytes');
    console.log('  - Folder:', folder);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "auto" },
          { quality: "auto:good" },
          { fetch_format: "auto" }
        ],
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        } else {
          console.log('✅ Cloudinary upload successful');
          console.log('  - URL:', result.secure_url);
          console.log('  - Public ID:', result.public_id);
          resolve(result);
        }
      }
    );

    const bufferStream = Readable.from(fileBuffer);
    bufferStream.pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    throw new Error('No public ID provided');
  }

  try {
    console.log('🗑️ Deleting from Cloudinary:', publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Delete result:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
};

export { cloudinary };