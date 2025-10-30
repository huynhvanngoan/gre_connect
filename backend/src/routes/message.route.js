import express from "express";
import {
    sendMessage,
    getMessages,
    getMessageById,
    editMessage,
    deleteMessage,
    reactToMessage,
    removeReaction,
    markAsRead,
    markAllAsRead,
    forwardMessage,
    searchMessages,
    getMediaMessages,
    getUnreadCount,
} from "../controllers/message.controller.js";

import {
    requireAuth,
    checkBanned,
} from "../middlewares/auth.middleware.js";

import {
    validateSendMessage,
    validateGetMessages,
    validateMessageId,
    validateEditMessage,
    validateDeleteMessage,
    validateReaction,
    validateForwardMessage,
    validateSearchMessages,
    validateGetMediaMessages,
    validateConversationId,
} from "../validations/message.validation.js";

import { handleValidationErrors } from "../middlewares/validation.middleware.js";
import { uploadToCloudinary } from "../middlewares/upload.middleware.js";
import { messageRateLimit } from "../middlewares/arcjet.middleware.js";

const router = express.Router();

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(checkBanned);

// --------------------------------------------
// Message CRUD Operations
// --------------------------------------------

/**
 * @route   POST /api/messages/:conversationId
 * @desc    Send a message in a conversation
 * @access  Private
 */
router.post(
    "/:conversationId",
    messageRateLimit,
    uploadToCloudinary.multiple("attachments", 5),
    validateSendMessage,
    handleValidationErrors,
    sendMessage
);

/**
 * @route   GET /api/messages/:conversationId
 * @desc    Get messages in a conversation
 * @access  Private
 */
router.get(
    "/:conversationId",
    validateGetMessages,
    handleValidationErrors,
    getMessages
);

/**
 * @route   GET /api/messages/message/:messageId
 * @desc    Get single message by ID
 * @access  Private
 */
router.get(
    "/message/:messageId",
    validateMessageId,
    handleValidationErrors,
    getMessageById
);

/**
 * @route   PUT /api/messages/:messageId
 * @desc    Edit a message
 * @access  Private (Message sender only)
 */
router.put(
    "/:messageId",
    validateEditMessage,
    handleValidationErrors,
    editMessage
);

/**
 * @route   DELETE /api/messages/:messageId
 * @desc    Delete a message (for everyone or just for me)
 * @access  Private
 */
router.delete(
    "/:messageId",
    validateDeleteMessage,
    handleValidationErrors,
    deleteMessage
);

// --------------------------------------------
// Message Interactions
// --------------------------------------------

/**
 * @route   POST /api/messages/:messageId/react
 * @desc    Add or update reaction to a message
 * @access  Private
 */
router.post(
    "/:messageId/react",
    validateReaction,
    handleValidationErrors,
    reactToMessage
);

/**
 * @route   DELETE /api/messages/:messageId/react
 * @desc    Remove reaction from a message
 * @access  Private
 */
router.delete(
    "/:messageId/react",
    validateMessageId,
    handleValidationErrors,
    removeReaction
);

/**
 * @route   POST /api/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
router.post(
    "/:messageId/read",
    validateMessageId,
    handleValidationErrors,
    markAsRead
);

/**
 * @route   POST /api/messages/:conversationId/read-all
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
router.post(
    "/:conversationId/read-all",
    validateConversationId,
    handleValidationErrors,
    markAllAsRead
);

/**
 * @route   POST /api/messages/:messageId/forward
 * @desc    Forward a message to another conversation
 * @access  Private
 */
router.post(
    "/:messageId/forward",
    validateForwardMessage,
    handleValidationErrors,
    forwardMessage
);

// --------------------------------------------
// Message Search & Filter
// --------------------------------------------

/**
 * @route   GET /api/messages/:conversationId/search
 * @desc    Search messages in a conversation
 * @access  Private
 */
router.get(
    "/:conversationId/search",
    validateSearchMessages,
    handleValidationErrors,
    searchMessages
);

/**
 * @route   GET /api/messages/:conversationId/media
 * @desc    Get media messages (images, videos, files) in a conversation
 * @access  Private
 */
router.get(
    "/:conversationId/media",
    validateGetMediaMessages,
    handleValidationErrors,
    getMediaMessages
);

/**
 * @route   GET /api/messages/:conversationId/unread-count
 * @desc    Get unread message count for a conversation
 * @access  Private
 */
router.get(
    "/:conversationId/unread-count",
    validateConversationId,
    handleValidationErrors,
    getUnreadCount
);

export default router;