import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Get notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
export const getNotificationPreferences = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("notificationSettings");

    if (!user) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    successResponse(res, HTTP_STATUS.OK, "Notification preferences retrieved successfully", {
        preferences: user.notificationSettings || {},
    });
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const preferences = req.body;

    const user = await User.findById(userId);

    if (!user) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    // Update preferences
    user.notificationSettings = {
        ...user.notificationSettings,
        ...preferences,
    };

    await user.save();

    successResponse(res, HTTP_STATUS.OK, "Notification preferences updated successfully", {
        preferences: user.notificationSettings,
    });
});

