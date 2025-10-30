import asyncHandler from "express-async-handler";
import { Notification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from "../models/notification.model.js";
import { successResponse } from "../utils/response.js";
import { HTTP_STATUS } from "../utils/constants.js";
import { getIO } from "../config/socket.js";

// ============================================
// GET ALL NOTIFICATIONS
// ============================================

/**
 * @desc    Get all notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
    const {
        limit = 20,
        page = 1,
        type,
        isRead,
    } = req.query;

    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Build query
    const query = {
        recipient: userId,
        isActive: true,
        isDismissed: false,
    };

    if (type) {
        query.type = type;
    }

    if (isRead !== undefined) {
        query.isRead = isRead === "true";
    }

    // Get notifications
    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate("sender", "firstName lastName username profilePicture role")
        .lean();

    // Get total count
    const total = await Notification.countDocuments(query);

    successResponse(res, HTTP_STATUS.OK, "Notifications retrieved successfully", {
        notifications,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

// ============================================
// GET UNREAD NOTIFICATIONS
// ============================================

/**
 * @desc    Get unread notifications
 * @route   GET /api/notifications/unread
 * @access  Private
 */
export const getUnreadNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const notifications = await Notification.findUnread(userId)
        .populate("sender", "firstName lastName username profilePicture role");

    successResponse(res, HTTP_STATUS.OK, "Unread notifications retrieved successfully", {
        notifications,
        count: notifications.length,
    });
});

// ============================================
// GET UNREAD COUNT
// ============================================

/**
 * @desc    Get unread notifications count
 * @route   GET /api/notifications/unread/count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const count = await Notification.getUnreadCount(userId);

    successResponse(res, HTTP_STATUS.OK, "Unread count retrieved successfully", {
        count,
    });
});

// ============================================
// GET NOTIFICATION BY ID
// ============================================

/**
 * @desc    Get single notification by ID
 * @route   GET /api/notifications/:notificationId
 * @access  Private
 */
export const getNotificationById = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId)
        .populate("sender", "firstName lastName username profilePicture role");

    if (!notification) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Notification not found");
    }

    // Check ownership
    if (!notification.recipient.equals(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view this notification");
    }

    // Mark as read
    if (!notification.isRead) {
        await notification.markAsRead();
    }

    successResponse(res, HTTP_STATUS.OK, "Notification retrieved successfully", {
        notification,
    });
});

// ============================================
// MARK AS READ
// ============================================

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:notificationId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Notification not found");
    }

    // Check ownership
    if (!notification.recipient.equals(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to modify this notification");
    }

    await notification.markAsRead();

    successResponse(res, HTTP_STATUS.OK, "Notification marked as read");
});

// ============================================
// MARK ALL AS READ
// ============================================

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    await Notification.markAllAsRead(userId);

    // Emit socket event
    const io = getIO();
    io.to(userId.toString()).emit("notifications-read-all");

    successResponse(res, HTTP_STATUS.OK, "All notifications marked as read");
});

// ============================================
// DISMISS NOTIFICATION
// ============================================

/**
 * @desc    Dismiss a notification
 * @route   DELETE /api/notifications/:notificationId
 * @access  Private
 */
export const dismissNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Notification not found");
    }

    // Check ownership
    if (!notification.recipient.equals(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to dismiss this notification");
    }

    await notification.dismiss();

    successResponse(res, HTTP_STATUS.OK, "Notification dismissed");
});

// ============================================
// DISMISS ALL NOTIFICATIONS
// ============================================

/**
 * @desc    Dismiss all notifications
 * @route   DELETE /api/notifications/dismiss-all
 * @access  Private
 */
export const dismissAllNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    await Notification.updateMany(
        {
            recipient: userId,
            isDismissed: false,
            isActive: true,
        },
        {
            $set: {
                isDismissed: true,
                dismissedAt: new Date(),
            },
        }
    );

    successResponse(res, HTTP_STATUS.OK, "All notifications dismissed");
});

// ============================================
// CREATE NOTIFICATION (Admin/System)
// ============================================

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

// ============================================
// BROADCAST NOTIFICATION (Admin only)
// ============================================

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

// ============================================
// DELETE OLD NOTIFICATIONS (Cleanup job)
// ============================================

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

// ============================================
// GET NOTIFICATION PREFERENCES
// ============================================

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

// ============================================
// UPDATE NOTIFICATION PREFERENCES
// ============================================

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

export default {
    getNotifications,
    getUnreadNotifications,
    getUnreadCount,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAllNotifications,
    createNotification,
    broadcastNotification,
    cleanupOldNotifications,
    getNotificationPreferences,
    updateNotificationPreferences,
};