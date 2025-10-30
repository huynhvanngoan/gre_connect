import { body, param, query } from "express-validator";
import { CONVERSATION_TYPES } from "../utils/constants.js";

// ============================================
// GET CONVERSATIONS VALIDATION
// ============================================

export const validateGetConversations = [
    query("type")
        .optional()
        .isIn(Object.values(CONVERSATION_TYPES))
        .withMessage(`Type must be one of: ${Object.values(CONVERSATION_TYPES).join(", ")}`),
    
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("skip")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Skip must be a positive integer"),
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
// CREATE DIRECT CONVERSATION VALIDATION
// ============================================

export const validateCreateDirectConversation = [
    body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("Invalid user ID"),
];

// ============================================
// CREATE GROUP CONVERSATION VALIDATION
// ============================================

export const validateCreateGroupConversation = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Group name is required")
        .isLength({ min: 1, max: 100 })
        .withMessage("Group name must be between 1 and 100 characters"),
    
    body("participantIds")
        .isArray({ min: 1 })
        .withMessage("At least one participant is required"),
    
    body("participantIds.*")
        .isMongoId()
        .withMessage("Invalid participant ID"),
    
    body("avatar")
        .optional()
        .trim()
        .isURL()
        .withMessage("Avatar must be a valid URL"),
    
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description must not exceed 500 characters"),
];

// ============================================
// UPDATE CONVERSATION VALIDATION
// ============================================

export const validateUpdateConversation = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    body("name")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Name must be between 1 and 100 characters"),
    
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description must not exceed 500 characters"),
    
    body("avatar")
        .optional()
        .trim()
        .isURL()
        .withMessage("Avatar must be a valid URL"),
];

// ============================================
// ADD PARTICIPANT VALIDATION
// ============================================

export const validateAddParticipant = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("Invalid user ID"),
    
    body("role")
        .optional()
        .isIn(["admin", "moderator", "member"])
        .withMessage("Role must be one of: admin, moderator, member"),
];

// ============================================
// REMOVE PARTICIPANT VALIDATION
// ============================================

export const validateRemoveParticipant = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
];

// ============================================
// UPDATE PARTICIPANT ROLE VALIDATION
// ============================================

export const validateUpdateParticipantRole = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
    
    body("role")
        .notEmpty()
        .withMessage("Role is required")
        .isIn(["admin", "moderator", "member"])
        .withMessage("Role must be one of: admin, moderator, member"),
];

// ============================================
// UPDATE SETTINGS VALIDATION
// ============================================

export const validateUpdateSettings = [
    param("conversationId")
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    body("allowFileSharing")
        .optional()
        .isBoolean()
        .withMessage("allowFileSharing must be a boolean"),
    
    body("allowVoiceMessages")
        .optional()
        .isBoolean()
        .withMessage("allowVoiceMessages must be a boolean"),
    
    body("allowVideoMessages")
        .optional()
        .isBoolean()
        .withMessage("allowVideoMessages must be a boolean"),
    
    body("allowCalls")
        .optional()
        .isBoolean()
        .withMessage("allowCalls must be a boolean"),
    
    body("maxFileSize")
        .optional()
        .isInt({ min: 1024, max: 52428800 }) // 1KB to 50MB
        .withMessage("maxFileSize must be between 1KB and 50MB"),
    
    body("onlyAdminsCanPost")
        .optional()
        .isBoolean()
        .withMessage("onlyAdminsCanPost must be a boolean"),
];

// ============================================
// SEARCH CONVERSATIONS VALIDATION
// ============================================

export const validateSearchConversations = [
    query("q")
        .trim()
        .notEmpty()
        .withMessage("Search query is required")
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
];

// ============================================
// EXPORTS
// ============================================

export default {
    validateGetConversations,
    validateConversationId,
    validateCreateDirectConversation,
    validateCreateGroupConversation,
    validateUpdateConversation,
    validateAddParticipant,
    validateRemoveParticipant,
    validateUpdateParticipantRole,
    validateUpdateSettings,
    validateSearchConversations,
};