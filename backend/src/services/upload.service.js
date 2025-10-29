import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { ENV } from "../config/env.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      folder = "uploads",
      width,
      height,
      crop = "limit",
      quality = "auto",
      format,
      resourceType = "auto",
    } = options;

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      quality,
    };

    // Add transformation options if provided
    if (width || height) {
      uploadOptions.transformation = {
        width,
        height,
        crop,
      };
    }

    if (format) {
      uploadOptions.format = format;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Upload image with optimization
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadImage = async (buffer, options = {}) => {
  const defaultOptions = {
    folder: "images",
    quality: "auto:good",
    fetch_format: "auto",
    resourceType: "image",
  };

  return await uploadToCloudinary(buffer, { ...defaultOptions, ...options });
};

/**
 * Upload video
 * @param {Buffer} buffer - Video buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadVideo = async (buffer, options = {}) => {
  const defaultOptions = {
    folder: "videos",
    resource_type: "video",
    quality: "auto",
  };

  return await uploadToCloudinary(buffer, { ...defaultOptions, ...options });
};

/**
 * Upload document/file
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadDocument = async (buffer, options = {}) => {
  const defaultOptions = {
    folder: "documents",
    resource_type: "raw",
  };

  return await uploadToCloudinary(buffer, { ...defaultOptions, ...options });
};

/**
 * Upload audio file
 * @param {Buffer} buffer - Audio buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadAudio = async (buffer, options = {}) => {
  const defaultOptions = {
    folder: "audio",
    resource_type: "video", // Cloudinary uses 'video' for audio files
  };

  return await uploadToCloudinary(buffer, { ...defaultOptions, ...options });
};

/**
 * Upload profile picture with optimization
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Upload result
 */
export const uploadProfilePicture = async (buffer) => {
  return await uploadImage(buffer, {
    folder: "profile-pictures",
    width: 400,
    height: 400,
    crop: "fill",
    gravity: "face",
    quality: "auto:good",
  });
};

/**
 * Upload banner image with optimization
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Upload result
 */
export const uploadBannerImage = async (buffer) => {
  return await uploadImage(buffer, {
    folder: "banners",
    width: 1500,
    height: 500,
    crop: "fill",
    quality: "auto:good",
  });
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Public ID of the file or full URL
 * @param {String} resourceType - Resource type (image, video, raw)
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFromCloudinary = async (publicIdOrUrl, resourceType = "image") => {
  try {
    let publicId = publicIdOrUrl;

    // Extract public ID from URL if full URL is provided
    if (publicIdOrUrl.includes("cloudinary.com")) {
      const urlParts = publicIdOrUrl.split("/");
      const uploadIndex = urlParts.findIndex((part) => part === "upload");
      
      if (uploadIndex !== -1) {
        // Get everything after 'upload' and version number
        const pathAfterUpload = urlParts.slice(uploadIndex + 2).join("/");
        // Remove file extension
        publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf("."));
      }
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array<String>} publicIds - Array of public IDs
 * @param {String} resourceType - Resource type
 * @returns {Promise<Object>} Deletion result
 */
export const deleteMultipleFromCloudinary = async (publicIds, resourceType = "image") => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error("Error deleting multiple files from Cloudinary:", error);
    throw error;
  }
};

/**
 * Get file details from Cloudinary
 * @param {String} publicId - Public ID of the file
 * @param {String} resourceType - Resource type
 * @returns {Promise<Object>} File details
 */
export const getFileDetails = async (publicId, resourceType = "image") => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error("Error getting file details from Cloudinary:", error);
    throw error;
  }
};

/**
 * Generate thumbnail for video
 * @param {String} publicId - Public ID of the video
 * @param {Object} options - Thumbnail options
 * @returns {String} Thumbnail URL
 */
export const generateVideoThumbnail = (publicId, options = {}) => {
  const {
    width = 300,
    height = 200,
    crop = "fill",
    startOffset = "0s",
  } = options;

  return cloudinary.url(publicId, {
    resource_type: "video",
    transformation: [
      { width, height, crop },
      { start_offset: startOffset },
      { fetch_format: "jpg" },
    ],
  });
};

/**
 * Generate optimized image URL
 * @param {String} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {String} Optimized image URL
 */
export const generateOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    crop = "limit",
    quality = "auto:good",
    format = "auto",
  } = options;

  const transformation = [];

  if (width || height) {
    transformation.push({ width, height, crop });
  }

  transformation.push({ quality, fetch_format: format });

  return cloudinary.url(publicId, {
    transformation,
  });
};

/**
 * Upload multiple files
 * @param {Array<Buffer>} buffers - Array of file buffers
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} Array of upload results
 */
export const uploadMultipleFiles = async (buffers, options = {}) => {
  try {
    const uploadPromises = buffers.map((buffer) =>
      uploadToCloudinary(buffer, options)
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Error uploading multiple files:", error);
    throw error;
  }
};

/**
 * Get file size and format
 * @param {String} url - File URL
 * @returns {Object} File info
 */
export const getFileInfo = (url) => {
  try {
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1];
    const [name, extension] = filename.split(".");

    return {
      url,
      filename,
      name,
      format: extension,
    };
  } catch (error) {
    console.error("Error getting file info:", error);
    return null;
  }
};

/**
 * Create a ZIP archive of multiple files (using Cloudinary)
 * @param {Array<String>} publicIds - Array of public IDs
 * @param {String} archiveName - Name of the archive
 * @returns {String} Archive URL
 */
export const createArchive = async (publicIds, archiveName = "archive") => {
  try {
    const result = await cloudinary.uploader.create_archive({
      public_ids: publicIds,
      resource_type: "image",
      type: "upload",
      target_public_id: `archives/${archiveName}`,
    });

    return result.secure_url;
  } catch (error) {
    console.error("Error creating archive:", error);
    throw error;
  }
};

/**
 * Get upload statistics
 * @returns {Promise<Object>} Upload statistics
 */
export const getUploadStats = async () => {
  try {
    const result = await cloudinary.api.usage();
    return {
      plan: result.plan,
      used: result.resources,
      limit: result.limit,
      bandwidth: result.bandwidth,
      storage: result.storage,
    };
  } catch (error) {
    console.error("Error getting upload stats:", error);
    throw error;
  }
};

/**
 * Validate file before upload
 * @param {Object} file - File object from multer
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result
 */
export const validateFile = (file, rules = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    allowedExtensions = [],
  } = rules;

  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB`);
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      errors.push(`File extension .${ext} is not allowed`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export default {
  uploadToCloudinary,
  uploadImage,
  uploadVideo,
  uploadDocument,
  uploadAudio,
  uploadProfilePicture,
  uploadBannerImage,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getFileDetails,
  generateVideoThumbnail,
  generateOptimizedImageUrl,
  uploadMultipleFiles,
  getFileInfo,
  createArchive,
  getUploadStats,
  validateFile,
};