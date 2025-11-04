import multer from "multer";
import {
    uploadProfilePicture,
    uploadBannerImage,
    uploadCoverImage,
    uploadPostAttachment,
    uploadToCloudinary as uploadHelper,
    validateImageType,
    validateVideoType,
    validateFileSize,
    getFileType,
} from "../utils/cloudinary.js";

// Multer memory storage (store in memory before uploading to Cloudinary)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    // Accept images, videos, and common document types
    const mime = (file.mimetype || '').toLowerCase();
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    const isDoc = mime.startsWith("application/") || mime.startsWith("text/");

    if (isImage || isVideo || isDoc) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file type"), false);
    }
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
    fileFilter: fileFilter,
});

/**
 * Middleware to upload single file to Cloudinary
 */
export const uploadToCloudinary = {
    single: (fieldName) => {
        return async (req, res, next) => {
            // First use multer to get the file
            upload.single(fieldName)(req, res, async (err) => {
                if (err) {
                    return res.status(400).json({
                        success: false,
                        message: err.message,
                    });
                }

                if (!req.file) {
                    return next();
                }

                try {
                    let result;

                    // Determine upload function based on field name
                    if (fieldName === "profilePicture" || fieldName === "image") {
                        result = await uploadProfilePicture(req.file.buffer);
                    } else if (fieldName === "banner" || fieldName === "bannerImage") {
                        result = await uploadBannerImage(req.file.buffer);
                    } else if (fieldName === "coverImage" || fieldName === "cover") {
                        result = await uploadCoverImage(req.file.buffer);
                    } else if (fieldName === "attachment" || fieldName === "media") {
                        const fileType = getFileType(req.file.mimetype);
                        result = await uploadPostAttachment(
                            req.file.buffer,
                            fileType,
                            req.file.originalname
                        );
                    } else {
                        // Default upload
                        result = await uploadHelper(req.file.buffer, {
                            folder: "education-platform/general",
                        });
                    }

                    // Add Cloudinary result to request
                    req.file.cloudinary = result;
                    req.file.path = result.secure_url;
                    req.file.publicId = result.public_id;

                    next();
                } catch (error) {
                    console.error("Cloudinary upload error:", error);
                    return res.status(500).json({
                        success: false,
                        message: "Error uploading file to cloud storage",
                        error: error.message,
                    });
                }
            });
        };
    },

    /**
     * Middleware to upload multiple files to Cloudinary
     */
    multiple: (fieldName, maxCount = 5) => {
        return async (req, res, next) => {
            upload.array(fieldName, maxCount)(req, res, async (err) => {
                if (err) {
                    return res.status(400).json({
                        success: false,
                        message: err.message,
                    });
                }

                if (!req.files || req.files.length === 0) {
                    return next();
                }

                try {
                    // Upload all files to Cloudinary
                    const uploadPromises = req.files.map(file => {
                        const fileType = getFileType(file.mimetype);
                        return uploadPostAttachment(file.buffer, fileType, file.originalname);
                    });

                    const results = await Promise.all(uploadPromises);

                    // Add Cloudinary results to files
                    req.files = req.files.map((file, index) => ({
                        ...file,
                        cloudinary: results[index],
                        path: results[index].secure_url,
                        publicId: results[index].public_id,
                    }));

                    next();
                } catch (error) {
                    console.error("Cloudinary upload error:", error);
                    return res.status(500).json({
                        success: false,
                        message: "Error uploading files to cloud storage",
                        error: error.message,
                    });
                }
            });
        };
    },

    /**
     * Middleware to upload fields (mixed single and multiple)
     */
    fields: (fields) => {
        return async (req, res, next) => {
            upload.fields(fields)(req, res, async (err) => {
                if (err) {
                    return res.status(400).json({
                        success: false,
                        message: err.message,
                    });
                }

                if (!req.files || Object.keys(req.files).length === 0) {
                    return next();
                }

                try {
                    // Upload all files to Cloudinary
                    for (const fieldName in req.files) {
                        const files = req.files[fieldName];

                        const uploadPromises = files.map(file => {
                            const fileType = getFileType(file.mimetype);

                            // Choose upload function based on field name
                            if (fieldName.includes("profile") || fieldName.includes("avatar")) {
                                return uploadProfilePicture(file.buffer);
                            } else if (fieldName.includes("banner") || fieldName.includes("cover")) {
                                return uploadBannerImage(file.buffer);
                            } else {
                                return uploadPostAttachment(file.buffer, fileType, file.originalname);
                            }
                        });

                        const results = await Promise.all(uploadPromises);

                        // Update files with Cloudinary results
                        req.files[fieldName] = files.map((file, index) => ({
                            ...file,
                            cloudinary: results[index],
                            path: results[index].secure_url,
                            publicId: results[index].public_id,
                        }));
                    }

                    next();
                } catch (error) {
                    console.error("Cloudinary upload error:", error);
                    return res.status(500).json({
                        success: false,
                        message: "Error uploading files to cloud storage",
                        error: error.message,
                    });
                }
            });
        };
    },
};

export default upload;