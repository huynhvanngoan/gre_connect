import asyncHandler from "express-async-handler";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Create a notification (System/Admin use)
 * @route   POST /api/notifications
 * @access  Private (Staff)
 */
export const createNotification = asyncHandler(async (req, res) => {
    const {
        recipientId,
        type,
        title,
        message,
        priority,
        actionUrl,
        channels,
        scheduledFor,
    } = req.body;

    if (req.user.role !== "staff") {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Only staff can create notifications");
    }

    const notification = await Notification.createNotification({
        recipientId,
        senderId: req.user._id,
        type,
        title,
        message,
        priority,
        actionUrl,
        channels,
        scheduledFor,
    });

    if (notification) {
        // Emit socket event
        const io = getIO();
        io.to(recipientId.toString()).emit("new-notification", notification);

        successResponse(res, HTTP_STATUS.CREATED, "Notification created successfully", {
            notification,
        });
    } else {
        successResponse(res, HTTP_STATUS.OK, "Notification not created (user settings)", {
            notification: null,
        });
    }
});

/**
 * @desc    Broadcast notification to multiple users
 * @route   POST /api/notifications/broadcast
 * @access  Private (Staff)
 */
export const broadcastNotification = asyncHandler(async (req, res) => {
    const {
        recipientIds,
        type,
        title,
        message,
        priority,
        actionUrl,
        channels,
    } = req.body;

    if (req.user.role !== "staff") {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Only staff can broadcast notifications");
    }

    const notifications = [];
    const io = getIO();

    for (const recipientId of recipientIds) {
        const notification = await Notification.createNotification({
            recipientId,
            senderId: req.user._id,
            type,
            title,
            message,
            priority,
            actionUrl,
            channels,
        });

        if (notification) {
            notifications.push(notification);
            // Emit socket event
            io.to(recipientId.toString()).emit("new-notification", notification);
        }
    }

    successResponse(res, HTTP_STATUS.CREATED, "Notifications broadcasted successfully", {
        count: notifications.length,
        total: recipientIds.length,
    });
});

/**
 * @desc    Delete old read notifications
 * @route   DELETE /api/notifications/cleanup
 * @access  Private (Staff)
 */
export const cleanupOldNotifications = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    if (req.user.role !== "staff") {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Only staff can cleanup notifications");
    }

    const result = await Notification.deleteOld(parseInt(days));

    successResponse(res, HTTP_STATUS.OK, "Old notifications deleted", {
        deletedCount: result.deletedCount,
    });
});

