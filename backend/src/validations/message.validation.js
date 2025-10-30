import { body, param, query } from "express-validator";
import { MESSAGE_TYPES } from "../utils/constants.js";

// ============================================
// SEND MESSAGE VALIDATION
// ============================================

export const validateSendMessage = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    body("messageType")
        .optional()
        .isIn(Object.values(MESSAGE_TYPES))
        .withMessage(`Message type must be one of: ${Object.values(MESSAGE_TYPES).join(", ")}`),
    
    body("content")
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage("Message content must not exceed 5000 characters"),
    
    body("replyTo")
        .optional()
        .isMongoId()
        .withMessage("Invalid reply message ID"),
    
    body("mentions")
        .optional()
        .isArray()
        .withMessage("Mentions must be an array"),
    
    body("mentions.*")
        .optional()
        .isMongoId()
        .withMessage("Invalid user ID in mentions"),
    
    body("location")
        .optional()
        .isObject()
        .withMessage("Location must be an object"),
    
    body("location.latitude")
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage("Latitude must be between -90 and 90"),
    
    body("location.longitude")
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage("Longitude must be between -180 and 180"),
    
    body("location.address")
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage("Address must not exceed 200 characters"),
    
    body("location.name")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Location name must not exceed 100 characters"),
];

// ============================================
// GET MESSAGES VALIDATION
// ============================================

export const validateGetMessages = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("before")
        .optional()
        .isISO8601()
        .withMessage("Before must be a valid ISO8601 date"),
];

// ============================================
// MESSAGE ID VALIDATION
// ============================================

export const validateMessageId = [
    param("messageId")
        .isMongoId()
        .withMessage("Invalid message ID"),
];

// ============================================
// EDIT MESSAGE VALIDATION
// ============================================

export const validateEditMessage = [
    param("messageId")
        .isMongoId()
        .withMessage("Invalid message ID"),
    
    body("content")
        .trim()
        .notEmpty()
        .withMessage("Content is required")
        .isLength({ min: 1, max: 5000 })
        .withMessage("Content must be between 1 and 5000 characters"),
];

// ============================================
// DELETE MESSAGE VALIDATION
// ============================================

export const validateDeleteMessage = [
    param("messageId")
        .isMongoId()
        .withMessage("Invalid message ID"),
    
    body("deleteForEveryone")
        .optional()
        .isBoolean()
        .withMessage("deleteForEveryone must be a boolean"),
];

// ============================================
// REACT TO MESSAGE VALIDATION
// ============================================

export const validateReaction = [
    param("messageId")
        .isMongoId()
        .withMessage("Invalid message ID"),
    
    body("emoji")
        .trim()
        .notEmpty()
        .withMessage("Emoji is required")
        .isLength({ min: 1, max: 10 })
        .withMessage("Emoji must be between 1 and 10 characters"),
];

// ============================================
// FORWARD MESSAGE VALIDATION
// ============================================

export const validateForwardMessage = [
    param("messageId")
        .isMongoId()
        .withMessage("Invalid message ID"),
    
    body("conversationId")
        .notEmpty()
        .withMessage("Target conversation ID is required")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
];

// ============================================
// SEARCH MESSAGES VALIDATION
// ============================================

export const validateSearchMessages = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    query("q")
        .trim()
        .notEmpty()
        .withMessage("Search query is required")
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
];

// ============================================
// GET MEDIA MESSAGES VALIDATION
// ============================================

export const validateGetMediaMessages = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    query("type")
        .optional()
        .isIn(["image", "video", "audio", "file"])
        .withMessage("Type must be one of: image, video, audio, file"),
];

// ============================================
// CONVERSATION ID VALIDATION
// ============================================

export const validateConversationId = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
];

// ============================================
// EXPORTS
// ============================================

export default {
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
};