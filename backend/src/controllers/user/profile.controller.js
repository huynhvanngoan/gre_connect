import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { canViewProfile, getUserStatistics, filterUserDataByPrivacy } from "../../services/user.service.js";

/**
 * @desc    Get current logged in user
 * @route   GET /api/users/me
 * @access  Private
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate("roleSpecificData.classId", "name code")
        .populate("roleSpecificData.classesTeaching", "name code")
        .select("-__v");

    if (!user) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    successResponse(res, HTTP_STATUS.OK, "Current user retrieved successfully", user);
});

/**
 * @desc    Get user profile by username or ID
 * @route   GET /api/users/profile/:identifier
 * @access  Public (with privacy checks)
 */
export const getUserProfile = asyncHandler(async (req, res) => {
    const { identifier } = req.params;

    // Check if identifier is MongoDB ObjectId or username
    const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);

    const user = isObjectId
        ? await User.findById(identifier)
        : await User.findOne({ username: identifier });

    if (!user) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    // Check if user is active
    if (!user.isActive) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "This account is not active");
    }

    // Privacy check
    const viewer = req.user; // May be undefined if not authenticated
    const canView = canViewProfile(user, viewer);

    if (!canView) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to view this profile");
    }

    // Filter user data based on privacy settings
    const userData = filterUserDataByPrivacy(user, viewer);

    successResponse(res, HTTP_STATUS.OK, "User profile retrieved successfully", userData);
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");

    // Fields that can be updated
    const allowedUpdates = [
        "firstName",
        "lastName",
        "bio",
        "location",
        "phone",
    ];

    // Update only allowed fields
    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            user[field] = req.body[field];
        }
    });

    // Update role-specific data if provided
    if (req.body.roleSpecificData) {
        Object.keys(req.body.roleSpecificData).forEach(key => {
            if (req.body.roleSpecificData[key] !== undefined) {
                user.roleSpecificData[key] = req.body.roleSpecificData[key];
            }
        });
    }

    await user.save();

    successResponse(res, HTTP_STATUS.OK, "Profile updated successfully", user);
});

/**
 * @desc    Update profile picture
 * @route   PUT /api/users/me/profile-picture
 * @access  Private
 */
export const updateProfilePicture = asyncHandler(async (req, res) => {
    if (!req.file) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Please upload an image");
    }

    const user = await findOr404(User, req.user._id, "User not found");

    // Upload to Cloudinary (handled by middleware)
    user.profilePicture = req.file.path; // Cloudinary URL
    await user.save();

    successResponse(res, HTTP_STATUS.OK, "Profile picture updated successfully", {
        profilePicture: user.profilePicture,
    });
});

/**
 * @desc    Update banner image
 * @route   PUT /api/users/me/banner
 * @access  Private
 */
export const updateBannerImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Please upload an image");
    }

    const user = await findOr404(User, req.user._id, "User not found");

    user.bannerImage = req.file.path;
    await user.save();

    successResponse(res, HTTP_STATUS.OK, "Banner image updated successfully", {
        bannerImage: user.bannerImage,
    });
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/me
 * @access  Private
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");

    // Soft delete: deactivate account
    user.isActive = false;
    await user.save();

    successResponse(res, HTTP_STATUS.OK, "Account deactivated successfully", null);
});

/**
 * @desc    Get user statistics
 * @route   GET /api/users/me/stats
 * @access  Private
 */
export const getUserStats = asyncHandler(async (req, res) => {
    const stats = await getUserStatistics(req.user._id);

    if (!stats) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    successResponse(res, HTTP_STATUS.OK, "User statistics retrieved successfully", stats);
});

