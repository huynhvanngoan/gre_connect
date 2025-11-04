import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Get notification settings
 * @route   GET /api/users/me/settings/notifications
 * @access  Private
 */
export const getNotificationSettings = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");

    successResponse(res, HTTP_STATUS.OK, "Notification settings retrieved successfully", user.notificationSettings);
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/users/me/settings/notifications
 * @access  Private
 */
export const updateNotificationSettings = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");

    // Update only provided fields
    Object.keys(req.body).forEach(key => {
        if (user.notificationSettings[key] !== undefined) {
            user.notificationSettings[key] = req.body[key];
        }
    });

    await user.save();

    successResponse(res, HTTP_STATUS.OK, "Notification settings updated successfully", user.notificationSettings);
});

/**
 * @desc    Get privacy settings
 * @route   GET /api/users/me/settings/privacy
 * @access  Private
 */
export const getPrivacySettings = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");

    successResponse(res, HTTP_STATUS.OK, "Privacy settings retrieved successfully", user.privacySettings);
});

/**
 * @desc    Update privacy settings
 * @route   PUT /api/users/me/settings/privacy
 * @access  Private
 */
export const updatePrivacySettings = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");

    // Update only provided fields
    Object.keys(req.body).forEach(key => {
        if (user.privacySettings[key] !== undefined) {
            user.privacySettings[key] = req.body[key];
        }
    });

    await user.save();

    successResponse(res, HTTP_STATUS.OK, "Privacy settings updated successfully", user.privacySettings);
});

