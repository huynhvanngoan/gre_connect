import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { ENV } from "../config/env.js";


// ============================================
// CLOUDINARY CONFIGURATION
// ============================================

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
  secure: true,
});

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Generic upload to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      folder = "education-platform/uploads",
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
 * Upload profile picture with optimization
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Upload result
 */
export const uploadProfilePicture = async (buffer) => {
  return await uploadToCloudinary(buffer, {
    folder: "education-platform/profile-pictures",
    width: 400,
    height: 400,
    crop: "fill",
    gravity: "face",
    quality: "auto:good",
    resourceType: "image",
  });
};

/**
 * Upload banner image with optimization
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Upload result
 */
export const uploadBannerImage = async (buffer) => {
  return await uploadToCloudinary(buffer, {
    folder: "education-platform/banners",
    width: 1500,
    height: 500,
    crop: "fill",
    quality: "auto:good",
    resourceType: "image",
  });
};

/**
 * Upload cover image for classes
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Upload result
 */
export const uploadCoverImage = async (buffer) => {
  return await uploadToCloudinary(buffer, {
    folder: "education-platform/covers",
    width: 1200,
    height: 400,
    crop: "fill",
    quality: "auto:good",
    resourceType: "image",
  });
};

/**
 * Upload post attachment (image, video, or file)
 * @param {Buffer} buffer - File buffer
 * @param {String} type - File type (image, video, file)
 * @returns {Promise<Object>} Upload result
 */
export const uploadPostAttachment = async (buffer, type = "auto", fileName = undefined) => {
  const folderMap = {
    image: "education-platform/posts/images",
    video: "education-platform/posts/videos",
    file: "education-platform/posts/files",
    auto: "education-platform/posts",
  };

  const resourceTypeMap = {
    image: "image",
    video: "video",
    file: "raw",
    auto: "auto",
  };

  const isRaw = (resourceTypeMap[type] || "auto") === "raw";
  return await uploadToCloudinary(buffer, {
    folder: folderMap[type] || folderMap.auto,
    resourceType: resourceTypeMap[type] || "auto",
    quality: "auto",
    use_filename: true,
    filename_override: fileName,
    flags: isRaw ? "attachment" : undefined,
  });
};

/**
 * Upload class material
 * @param {Buffer} buffer - File buffer
 * @param {String} type - File type
 * @returns {Promise<Object>} Upload result
 */
export const uploadClassMaterial = async (buffer, type = "auto") => {
  return await uploadToCloudinary(buffer, {
    folder: "education-platform/class-materials",
    resourceType: type === "image" || type === "video" ? type : "raw",
  });
};

/**
 * Upload homework file
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Object>} Upload result
 */
export const uploadHomeworkFile = async (buffer) => {
  return await uploadToCloudinary(buffer, {
    folder: "education-platform/homework",
    resourceType: "raw",
  });
};

/**
 * Upload message attachment
 * @param {Buffer} buffer - File buffer
 * @param {String} type - File type
 * @returns {Promise<Object>} Upload result
 */
export const uploadMessageAttachment = async (buffer, type = "auto") => {
  const folderMap = {
    image: "education-platform/messages/images",
    video: "education-platform/messages/videos",
    audio: "education-platform/messages/audio",
    file: "education-platform/messages/files",
  };

  const resourceTypeMap = {
    image: "image",
    video: "video",
    audio: "video", // Cloudinary uses 'video' for audio
    file: "raw",
  };

  return await uploadToCloudinary(buffer, {
    folder: folderMap[type] || "education-platform/messages",
    resourceType: resourceTypeMap[type] || "auto",
  });
};

// ============================================
// DELETE FUNCTIONS
// ============================================

/**
 * Delete file from Cloudinary
 * @param {String} publicIdOrUrl - Public ID or full URL
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
        const pathAfterUpload = urlParts.slice(uploadIndex + 2).join("/");
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
    console.error("Error deleting multiple files:", error);
    throw error;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get file type from mimetype
 * @param {String} mimetype - File mimetype
 * @returns {String} File type
 */
export const getFileType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "file";
};

/**
 * Validate image type
 * @param {String} mimetype - File mimetype
 * @returns {Boolean} Is valid image
 */
export const validateImageType = (mimetype) => {
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return validTypes.includes(mimetype);
};

/**
 * Validate video type
 * @param {String} mimetype - File mimetype
 * @returns {Boolean} Is valid video
 */
export const validateVideoType = (mimetype) => {
  const validTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/webm"];
  return validTypes.includes(mimetype);
};

/**
 * Validate file size
 * @param {Number} size - File size in bytes
 * @param {Number} maxSize - Max size in bytes
 * @returns {Boolean} Is valid size
 */
export const validateFileSize = (size, maxSize = 50 * 1024 * 1024) => {
  return size <= maxSize;
};

/**
 * Generate video thumbnail
 * @param {String} publicId - Video public ID
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
 * @param {String} publicId - Image public ID
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
 * Get file details from Cloudinary
 * @param {String} publicId - Public ID
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
    console.error("Error getting file details:", error);
    throw error;
  }
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

export default {
  uploadToCloudinary,
  uploadProfilePicture,
  uploadBannerImage,
  uploadCoverImage,
  uploadPostAttachment,
  uploadClassMaterial,
  uploadHomeworkFile,
  uploadMessageAttachment,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getFileType,
  validateImageType,
  validateVideoType,
  validateFileSize,
  generateVideoThumbnail,
  generateOptimizedImageUrl,
  getFileDetails,
  uploadMultipleFiles,
  getUploadStats,
};