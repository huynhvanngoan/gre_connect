import asyncHandler from "express-async-handler";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

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

