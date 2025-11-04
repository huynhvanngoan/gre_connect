import asyncHandler from "express-async-handler";
import { Notification } from "../../models/notification.model.js";
import User from "../../models/user.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Create a notification (Admin/Staff)
 * @route   POST /api/notifications
 * @access  Private (Admin/Staff)
 */
export const createNotification = asyncHandler(async (req, res) => {
    const { recipientId, type, title, message, actionUrl, metadata } = req.body;
    const senderId = req.user._id;

    // Check if recipient exists
    const recipient = await findOr404(User, recipientId, "Recipient not found");

    // Create notification
    const notification = await Notification.createNotification({
        recipientId,
        senderId,
        type: type || NOTIFICATION_TYPES.SYSTEM,
        title,
        message,
        actionUrl,
        metadata,
    });

    // Emit socket event
    const io = getIO();
    io.to(recipientId.toString()).emit("notification", notification);

    successResponse(res, HTTP_STATUS.CREATED, "Notification created successfully", { notification });
});

/**
 * @desc    Broadcast notification to all users (Admin only)
 * @route   POST /api/notifications/broadcast
 * @access  Private (Admin)
 */
export const broadcastNotification = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can broadcast notifications");
    }

    const { type, title, message, actionUrl, metadata } = req.body;

    // Get all active users
    const users = await User.find({ isActive: true, isBanned: false }).select("_id");

    const notifications = [];
    const io = getIO();

    for (const user of users) {
        const notification = await Notification.createNotification({
            recipientId: user._id,
            senderId: req.user._id,
            type: type || NOTIFICATION_TYPES.SYSTEM,
            title,
            message,
            actionUrl,
            metadata,
        });

        notifications.push(notification);

        // Emit socket event
        io.to(user._id.toString()).emit("notification", notification);
    }

    successResponse(res, HTTP_STATUS.CREATED, "Notification broadcasted successfully", {
        count: notifications.length,
    });
});

/**
 * @desc    Cleanup old notifications (Admin only)
 * @route   DELETE /api/notifications/cleanup
 * @access  Private (Admin)
 */
export const cleanupOldNotifications = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can cleanup notifications");
    }

    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true,
        isDismissed: true,
    });

    successResponse(res, HTTP_STATUS.OK, "Old notifications cleaned up", {
        deletedCount: result.deletedCount,
    });
});

