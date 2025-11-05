import asyncHandler from "express-async-handler";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Get user's notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
export const getNotificationPreferences = asyncHandler(async (req, res) => {
    const preferences = req.user.notificationSettings;

    successResponse(res, HTTP_STATUS.OK, "Notification preferences retrieved", {
        preferences,
    });
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
    const updates = req.body;

    // Update user's notification settings
    Object.keys(updates).forEach(key => {
        if (req.user.notificationSettings[key] !== undefined) {
            req.user.notificationSettings[key] = updates[key];
        }
    });

    await req.user.save();

    successResponse(res, HTTP_STATUS.OK, "Notification preferences updated", {
        preferences: req.user.notificationSettings,
    });
});

