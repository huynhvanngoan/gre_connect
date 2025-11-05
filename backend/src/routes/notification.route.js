import express from "express";
import {
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
} from "../controllers/notification/index.js";

import {
    requireAuth,
    requireRole,
    checkBanned,
} from "../middlewares/auth.middleware.js";

import { handleValidationErrors } from "../middlewares/validation.middleware.js";
import { param, body, query } from "express-validator";
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from "../utils/constants.js";

const router = express.Router();

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(checkBanned);

// --------------------------------------------
// Get Notifications
// --------------------------------------------

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
router.get(
    "/",
    [
        query("limit").optional().isInt({ min: 1, max: 100 }),
        query("page").optional().isInt({ min: 1 }),
        query("type").optional().isIn(Object.values(NOTIFICATION_TYPES)),
        query("isRead").optional().isBoolean(),
    ],
    handleValidationErrors,
    getNotifications
);

/**
 * @route   GET /api/notifications/unread
 * @desc    Get unread notifications
 * @access  Private
 */
router.get("/unread", getUnreadNotifications);

/**
 * @route   GET /api/notifications/unread/count
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get("/unread/count", getUnreadCount);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get("/preferences", getNotificationPreferences);

/**
 * @route   GET /api/notifications/:notificationId
 * @desc    Get single notification by ID
 * @access  Private
 */
router.get(
    "/:notificationId",
    [param("notificationId").isMongoId()],
    handleValidationErrors,
    getNotificationById
);

// --------------------------------------------
// Update Notifications
// --------------------------------------------

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
    "/:notificationId/read",
    [param("notificationId").isMongoId()],
    handleValidationErrors,
    markAsRead
);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/read-all", markAllAsRead);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
    "/preferences",
    [
        body("email").optional().isBoolean(),
        body("push").optional().isBoolean(),
        body("announcements").optional().isBoolean(),
        body("homework").optional().isBoolean(),
        body("comments").optional().isBoolean(),
        body("likes").optional().isBoolean(),
    ],
    handleValidationErrors,
    updateNotificationPreferences
);

// --------------------------------------------
// Delete Notifications
// --------------------------------------------

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Dismiss a notification
 * @access  Private
 */
router.delete(
    "/:notificationId",
    [param("notificationId").isMongoId()],
    handleValidationErrors,
    dismissNotification
);

/**
 * @route   DELETE /api/notifications/dismiss-all
 * @desc    Dismiss all notifications
 * @access  Private
 */
router.delete("/dismiss-all", dismissAllNotifications);

// --------------------------------------------
// Admin/Staff Routes
// --------------------------------------------

/**
 * @route   POST /api/notifications
 * @desc    Create a notification
 * @access  Private (Staff)
 */
router.post(
    "/",
    requireRole(["staff"]),
    [
        body("recipientId").notEmpty().isMongoId(),
        body("type").notEmpty().isIn(Object.values(NOTIFICATION_TYPES)),
        body("title").notEmpty().trim().isLength({ min: 1, max: 200 }),
        body("message").notEmpty().trim().isLength({ min: 1, max: 1000 }),
        body("priority").optional().isIn(Object.values(NOTIFICATION_PRIORITIES)),
        body("actionUrl").optional().trim(),
        body("channels").optional().isObject(),
        body("scheduledFor").optional().isISO8601(),
    ],
    handleValidationErrors,
    createNotification
);

/**
 * @route   POST /api/notifications/broadcast
 * @desc    Broadcast notification to multiple users
 * @access  Private (Staff)
 */
router.post(
    "/broadcast",
    requireRole(["staff"]),
    [
        body("recipientIds").notEmpty().isArray(),
        body("recipientIds.*").isMongoId(),
        body("type").notEmpty().isIn(Object.values(NOTIFICATION_TYPES)),
        body("title").notEmpty().trim().isLength({ min: 1, max: 200 }),
        body("message").notEmpty().trim().isLength({ min: 1, max: 1000 }),
        body("priority").optional().isIn(Object.values(NOTIFICATION_PRIORITIES)),
        body("actionUrl").optional().trim(),
        body("channels").optional().isObject(),
    ],
    handleValidationErrors,
    broadcastNotification
);

/**
 * @route   DELETE /api/notifications/cleanup
 * @desc    Delete old read notifications
 * @access  Private (Staff)
 */
router.delete(
    "/cleanup",
    requireRole(["staff"]),
    [query("days").optional().isInt({ min: 1, max: 365 })],
    handleValidationErrors,
    cleanupOldNotifications
);

export default router;