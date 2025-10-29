import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================

/**
 * Configure Cloudinary with environment variables
 */
export const configureCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    console.log("✅ Cloudinary configured");
};

// Auto-configure on import
configureCloudinary();

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Upload image from buffer to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary response
 */
export const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const {
            folder = "education-platform",
            transformation = [],
            resource_type = "auto",
            quality = "auto",
            format = "auto",
        } = options;
        
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type,
                transformation: [
                    { quality },
                    { fetch_format: format },
                    ...transformation,
                ],
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
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
 * Upload profile picture with optimizations
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>}
 */
export const uploadProfilePicture = async (buffer) => {
    return uploadToCloudinary(buffer, {
        folder: "education-platform/profiles",
        transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto:good" },
            { fetch_format: "auto" },
        ],
    });
};

/**
 * Upload banner image with optimizations
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>}
 */
export const uploadBannerImage = async (buffer) => {
    return uploadToCloudinary(buffer, {
        folder: "education-platform/banners",
        transformation: [
            { width: 1500, height: 500, crop: "fill" },
            { quality: "auto:good" },
            { fetch_format: "auto" },
        ],
    });
};

/**
 * Upload cover image for classes
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>}
 */
export const uploadCoverImage = async (buffer) => {
    return uploadToCloudinary(buffer, {
        folder: "education-platform/covers",
        transformation: [
            { width: 1200, height: 630, crop: "fill" },
            { quality: "auto:good" },
            { fetch_format: "auto" },
        ],
    });
};

/**
 * Upload post attachment (image/video)
 * @param {Buffer} buffer - File buffer
 * @param {String} resourceType - 'image' or 'video'
 * @returns {Promise<Object>}
 */
export const uploadPostAttachment = async (buffer, resourceType = "image") => {
    const options = {
        folder: "education-platform/posts",
        resource_type: resourceType,
    };
    
    if (resourceType === "image") {
        options.transformation = [
            { width: 1200, crop: "limit" },
            { quality: "auto:good" },
            { fetch_format: "auto" },
        ];
    } else if (resourceType === "video") {
        options.transformation = [
            { width: 1280, crop: "limit" },
            { quality: "auto" },
        ];
    }
    
    return uploadToCloudinary(buffer, options);
};

/**
 * Upload homework/assignment file
 * @param {Buffer} buffer - File buffer
 * @param {String} resourceType - Type of file
 * @returns {Promise<Object>}
 */
export const uploadHomeworkFile = async (buffer, resourceType = "auto") => {
    return uploadToCloudinary(buffer, {
        folder: "education-platform/homework",
        resource_type: resourceType,
    });
};

/**
 * Upload class material
 * @param {Buffer} buffer - File buffer
 * @param {String} resourceType - Type of file
 * @returns {Promise<Object>}
 */
export const uploadClassMaterial = async (buffer, resourceType = "auto") => {
    return uploadToCloudinary(buffer, {
        folder: "education-platform/materials",
        resource_type: resourceType,
    });
};

// ============================================
// DELETE FUNCTIONS
// ============================================

/**
 * Delete file from Cloudinary by public ID
 * @param {String} publicId - Cloudinary public ID
 * @param {String} resourceType - Type of resource (default: 'image')
 * @returns {Promise<Object>}
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        
        if (result.result === "ok") {
            console.log(`✅ Deleted from Cloudinary: ${publicId}`);
        } else {
            console.log(`⚠️  Failed to delete: ${publicId}`, result);
        }
        
        return result;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        throw error;
    }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array<String>} publicIds - Array of public IDs
 * @param {String} resourceType - Type of resource
 * @returns {Promise<Array>}
 */
export const deleteMultipleFromCloudinary = async (publicIds, resourceType = "image") => {
    try {
        const deletePromises = publicIds.map(id => 
            deleteFromCloudinary(id, resourceType)
        );
        
        const results = await Promise.allSettled(deletePromises);
        
        const successful = results.filter(r => r.status === "fulfilled").length;
        const failed = results.filter(r => r.status === "rejected").length;
        
        console.log(`✅ Deleted ${successful}/${publicIds.length} files`);
        if (failed > 0) {
            console.log(`⚠️  Failed to delete ${failed} files`);
        }
        
        return results;
    } catch (error) {
        console.error("Error deleting multiple files:", error);
        throw error;
    }
};

// ============================================
// URL MANIPULATION FUNCTIONS
// ============================================

/**
 * Extract public ID from Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @returns {String|null} - Public ID or null
 */
export const extractPublicId = (url) => {
    if (!url || typeof url !== "string") return null;
    
    // Match pattern: /v[version_number]/[public_id].[format]
    const matches = url.match(/\/v\d+\/(.+)\./);
    
    if (matches && matches[1]) {
        return matches[1];
    }
    
    return null;
};

/**
 * Get optimized image URL with transformations
 * @param {String} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {String} - Optimized URL
 */
export const getOptimizedImageUrl = (url, options = {}) => {
    const publicId = extractPublicId(url);
    
    if (!publicId) {
        return url; // Return original if can't extract public ID
    }
    
    const {
        width,
        height,
        crop = "fill",
        quality = "auto",
        format = "auto",
        gravity,
    } = options;
    
    const transformations = [];
    
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (crop) transformations.push(`c_${crop}`);
    if (gravity) transformations.push(`g_${gravity}`);
    transformations.push(`q_${quality}`);
    transformations.push(`f_${format}`);
    
    return cloudinary.url(publicId, {
        transformation: transformations,
    });
};

/**
 * Get responsive image URLs (multiple sizes)
 * @param {String} url - Original URL
 * @returns {Object} - Object with different sizes
 */
export const getResponsiveImageUrls = (url) => {
    const publicId = extractPublicId(url);
    
    if (!publicId) {
        return {
            thumbnail: url,
            small: url,
            medium: url,
            large: url,
            original: url,
        };
    }
    
    return {
        thumbnail: cloudinary.url(publicId, {
            transformation: [
                { width: 150, height: 150, crop: "fill" },
                { quality: "auto" },
                { fetch_format: "auto" },
            ],
        }),
        small: cloudinary.url(publicId, {
            transformation: [
                { width: 400, crop: "limit" },
                { quality: "auto" },
                { fetch_format: "auto" },
            ],
        }),
        medium: cloudinary.url(publicId, {
            transformation: [
                { width: 800, crop: "limit" },
                { quality: "auto" },
                { fetch_format: "auto" },
            ],
        }),
        large: cloudinary.url(publicId, {
            transformation: [
                { width: 1200, crop: "limit" },
                { quality: "auto" },
                { fetch_format: "auto" },
            ],
        }),
        original: url,
    };
};

/**
 * Generate video thumbnail URL
 * @param {String} videoUrl - Cloudinary video URL
 * @returns {String} - Thumbnail URL
 */
export const getVideoThumbnail = (videoUrl) => {
    const publicId = extractPublicId(videoUrl);
    
    if (!publicId) {
        return null;
    }
    
    return cloudinary.url(publicId, {
        resource_type: "video",
        format: "jpg",
        transformation: [
            { width: 400, height: 300, crop: "fill" },
            { quality: "auto" },
        ],
    });
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate file size
 * @param {Number} size - File size in bytes
 * @param {Number} maxSize - Max size in bytes (default: 10MB)
 * @returns {Boolean}
 */
export const validateFileSize = (size, maxSize = 10 * 1024 * 1024) => {
    return size <= maxSize;
};

/**
 * Validate image file type
 * @param {String} mimetype - File mimetype
 * @returns {Boolean}
 */
export const validateImageType = (mimetype) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    ];
    
    return allowedTypes.includes(mimetype);
};

/**
 * Validate video file type
 * @param {String} mimetype - File mimetype
 * @returns {Boolean}
 */
export const validateVideoType = (mimetype) => {
    const allowedTypes = [
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-ms-wmv",
    ];
    
    return allowedTypes.includes(mimetype);
};

/**
 * Get file type from mimetype
 * @param {String} mimetype - File mimetype
 * @returns {String} - 'image', 'video', 'document', or 'other'
 */
export const getFileType = (mimetype) => {
    if (mimetype.startsWith("image/")) return "image";
    if (mimetype.startsWith("video/")) return "video";
    if (mimetype.startsWith("audio/")) return "audio";
    
    // Document types
    const documentTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    
    if (documentTypes.includes(mimetype)) return "document";
    
    return "other";
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format file size to human readable
 * @param {Number} bytes - File size in bytes
 * @returns {String} - Formatted size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

/**
 * Generate unique filename
 * @param {String} originalName - Original filename
 * @returns {String} - Unique filename
 */
export const generateUniqueFilename = (originalName) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const extension = originalName.split(".").pop();
    const nameWithoutExt = originalName.split(".").slice(0, -1).join(".");
    
    return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
};

/**
 * Check if URL is a Cloudinary URL
 * @param {String} url - URL to check
 * @returns {Boolean}
 */
export const isCloudinaryUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    
    return url.includes("cloudinary.com") || url.includes("res.cloudinary.com");
};

// ============================================
// FOLDER MANAGEMENT
// ============================================

/**
 * List all files in a folder
 * @param {String} folder - Folder path
 * @param {Object} options - List options
 * @returns {Promise<Object>}
 */
export const listFilesInFolder = async (folder, options = {}) => {
    try {
        const result = await cloudinary.api.resources({
            type: "upload",
            prefix: folder,
            max_results: options.maxResults || 100,
            ...options,
        });
        
        return result;
    } catch (error) {
        console.error("Error listing files:", error);
        throw error;
    }
};

/**
 * Delete entire folder and its contents
 * @param {String} folder - Folder path
 * @returns {Promise<Object>}
 */
export const deleteFolder = async (folder) => {
    try {
        // First, delete all resources in the folder
        await cloudinary.api.delete_resources_by_prefix(folder);
        
        // Then delete the folder itself
        const result = await cloudinary.api.delete_folder(folder);
        
        console.log(`✅ Deleted folder: ${folder}`);
        return result;
    } catch (error) {
        console.error("Error deleting folder:", error);
        throw error;
    }
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
    // Configuration
    configureCloudinary,
    
    // Upload
    uploadToCloudinary,
    uploadProfilePicture,
    uploadBannerImage,
    uploadCoverImage,
    uploadPostAttachment,
    uploadHomeworkFile,
    uploadClassMaterial,
    
    // Delete
    deleteFromCloudinary,
    deleteMultipleFromCloudinary,
    
    // URL Manipulation
    extractPublicId,
    getOptimizedImageUrl,
    getResponsiveImageUrls,
    getVideoThumbnail,
    
    // Validation
    validateFileSize,
    validateImageType,
    validateVideoType,
    getFileType,
    
    // Utilities
    formatFileSize,
    generateUniqueFilename,
    isCloudinaryUrl,
    
    // Folder Management
    listFilesInFolder,
    deleteFolder,
    
    // Cloudinary instance
    cloudinary,
};