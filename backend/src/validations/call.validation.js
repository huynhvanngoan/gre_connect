import { body, param, query } from "express-validator";
import { CALL_TYPES, CALL_STATUS } from "../utils/constants.js";

// ============================================
// INITIATE CALL VALIDATION
// ============================================

export const validateInitiateCall = [
    body("recipientId")
        .optional()
        .isMongoId()
        .withMessage("Invalid recipient ID"),
    
    body("conversationId")
        .optional()
        .isMongoId()
        .withMessage("Invalid conversation ID"),
    
    body("callType")
        .notEmpty()
        .withMessage("Call type is required")
        .isIn(Object.values(CALL_TYPES))
        .withMessage(`Call type must be one of: ${Object.values(CALL_TYPES).join(", ")}`),
    
    body("isVideoEnabled")
        .optional()
        .isBoolean()
        .withMessage("isVideoEnabled must be a boolean"),
    
    body("isAudioEnabled")
        .optional()
        .isBoolean()
        .withMessage("isAudioEnabled must be a boolean"),
];

// ============================================
// JOIN CALL VALIDATION
// ============================================

export const validateJoinCall = [
    param("callId")
        .isMongoId()
        .withMessage("Invalid call ID"),
    
    body("isVideoEnabled")
        .optional()
        .isBoolean()
        .withMessage("isVideoEnabled must be a boolean"),
    
    body("isAudioEnabled")
        .optional()
        .isBoolean()
        .withMessage("isAudioEnabled must be a boolean"),
];

// ============================================
// LEAVE CALL VALIDATION
// ============================================

export const validateLeaveCall = [
    param("callId")
        .isMongoId()
        .withMessage("Invalid call ID"),
];

// ============================================
// END CALL VALIDATION
// ============================================

export const validateEndCall = [
    param("callId")
        .isMongoId()
        .withMessage("Invalid call ID"),
];

// ============================================
// TOGGLE AUDIO/VIDEO VALIDATION
// ============================================

export const validateToggleMedia = [
    param("callId")
        .isMongoId()
        .withMessage("Invalid call ID"),
    
    body("enabled")
        .notEmpty()
        .withMessage("Enabled status is required")
        .isBoolean()
        .withMessage("Enabled must be a boolean"),
];

// ============================================
// CALL ID VALIDATION
// ============================================

export const validateCallId = [
    param("callId")
        .isMongoId()
        .withMessage("Invalid call ID"),
];

// ============================================
// GET CALL HISTORY VALIDATION
// ============================================

export const validateGetCallHistory = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1"),
    
    query("callType")
        .optional()
        .isIn(Object.values(CALL_TYPES))
        .withMessage(`Call type must be one of: ${Object.values(CALL_TYPES).join(", ")}`),
    
    query("status")
        .optional()
        .isIn(Object.values(CALL_STATUS))
        .withMessage(`Status must be one of: ${Object.values(CALL_STATUS).join(", ")}`),
];

// ============================================
// WEBRTC SIGNALING VALIDATION
// ============================================

export const validateSignaling = [
    param("callId")
        .isMongoId()
        .withMessage("Invalid call ID"),
    
    body("type")
        .notEmpty()
        .withMessage("Signal type is required")
        .isIn(["offer", "answer", "ice-candidate"])
        .withMessage("Type must be one of: offer, answer, ice-candidate"),
    
    body("data")
        .notEmpty()
        .withMessage("Signal data is required"),
];

// ============================================
// CALL RATING VALIDATION
// ============================================

export const validateRateCall = [
    param("callId")
        .isMongoId()
        .withMessage("Invalid call ID"),
    
    body("rating")
        .notEmpty()
        .withMessage("Rating is required")
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
    
    body("feedback")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Feedback must not exceed 500 characters"),
];

// ============================================
// REPORT CALL ISSUE VALIDATION
// ============================================

export const validateReportCallIssue = [
    param("callId")
        .isMongoId()
        .withMessage("Invalid call ID"),
    
    body("issueType")
        .notEmpty()
        .withMessage("Issue type is required")
        .isIn(["audio", "video", "connection", "other"])
        .withMessage("Issue type must be one of: audio, video, connection, other"),
    
    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ min: 10, max: 500 })
        .withMessage("Description must be between 10 and 500 characters"),
];

// ============================================
// EXPORTS
// ============================================

export default {
    validateInitiateCall,
    validateJoinCall,
    validateLeaveCall,
    validateEndCall,
    validateToggleMedia,
    validateCallId,
    validateGetCallHistory,
    validateSignaling,
    validateRateCall,
    validateReportCallIssue,
};