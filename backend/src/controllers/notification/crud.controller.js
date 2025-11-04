import asyncHandler from "express-async-handler";
import { Notification } from "../../models/notification.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

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

    createPaginatedResponse(res, HTTP_STATUS.OK, "Notifications retrieved successfully", notifications, total, page, limit);
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
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Notification not found");
    }

    // Check if notification belongs to user
    if (!notification.recipient.equals(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    // Mark as read if not already read
    if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
    }

    successResponse(res, HTTP_STATUS.OK, "Notification retrieved successfully", { notification });
});

