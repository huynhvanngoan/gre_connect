import asyncHandler from "express-async-handler";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

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

