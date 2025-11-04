import asyncHandler from "express-async-handler";
import { Notification } from "../../models/notification.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:notificationId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await findOr404(Notification, notificationId, "Notification not found");

    // Check if notification belongs to user
    if (!notification.recipient.equals(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    successResponse(res, HTTP_STATUS.OK, "Notification marked as read");
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const result = await Notification.updateMany(
        {
            recipient: userId,
            isRead: false,
            isActive: true,
        },
        {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        }
    );

    successResponse(res, HTTP_STATUS.OK, "All notifications marked as read", {
        updatedCount: result.modifiedCount,
    });
});

/**
 * @desc    Dismiss a notification
 * @route   PUT /api/notifications/:notificationId/dismiss
 * @access  Private
 */
export const dismissNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await findOr404(Notification, notificationId, "Notification not found");

    // Check if notification belongs to user
    if (!notification.recipient.equals(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    notification.isDismissed = true;
    await notification.save();

    successResponse(res, HTTP_STATUS.OK, "Notification dismissed");
});

/**
 * @desc    Dismiss all notifications
 * @route   PUT /api/notifications/dismiss-all
 * @access  Private
 */
export const dismissAllNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const result = await Notification.updateMany(
        {
            recipient: userId,
            isDismissed: false,
            isActive: true,
        },
        {
            $set: {
                isDismissed: true,
            },
        }
    );

    successResponse(res, HTTP_STATUS.OK, "All notifications dismissed", {
        updatedCount: result.modifiedCount,
    });
});

