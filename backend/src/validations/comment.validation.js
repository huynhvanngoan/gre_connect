import { body, param, query } from "express-validator";
import { COMMENT_TYPES } from "../utils/constants.js";

// ============================================
// CREATE COMMENT VALIDATION
// ============================================

export const validateCreateComment = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    body("content")
        .trim()
        .notEmpty()
        .withMessage("Comment content is required")
        .isLength({ min: 1, max: 500 })
        .withMessage("Content must be between 1 and 500 characters"),
    
    body("commentType")
        .optional()
        .isIn(Object.values(COMMENT_TYPES))
        .withMessage(`Comment type must be one of: ${Object.values(COMMENT_TYPES).join(", ")}`),
    
    body("parentComment")
        .optional()
        .isMongoId()
        .withMessage("Invalid parent comment ID"),
    
    body("mentions")
        .optional()
        .isArray()
        .withMessage("Mentions must be an array"),
    
    body("mentions.*")
        .optional()
        .isMongoId()
        .withMessage("Invalid user ID in mentions"),
];

// ============================================
// UPDATE COMMENT VALIDATION
// ============================================

export const validateUpdateComment = [
    param("commentId")
        .isMongoId()
        .withMessage("Invalid comment ID"),
    
    body("content")
        .trim()
        .notEmpty()
        .withMessage("Content is required")
        .isLength({ min: 1, max: 500 })
        .withMessage("Content must be between 1 and 500 characters"),
];

// ============================================
// COMMENT ID VALIDATION
// ============================================

export const validateCommentId = [
    param("commentId")
        .isMongoId()
        .withMessage("Invalid comment ID"),
];

// ============================================
// POST ID VALIDATION
// ============================================

export const validatePostId = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
];

// ============================================
// REPORT COMMENT VALIDATION
// ============================================

export const validateReportComment = [
    param("commentId")
        .isMongoId()
        .withMessage("Invalid comment ID"),
    
    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Report reason is required")
        .isLength({ min: 10, max: 500 })
        .withMessage("Reason must be between 10 and 500 characters"),
];

// ============================================
// GET COMMENTS VALIDATION
// ============================================

export const validateGetComments = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1"),
    
    query("sortBy")
        .optional()
        .isIn(["createdAt", "likesCount", "repliesCount"])
        .withMessage("Invalid sort field"),
    
    query("order")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Order must be asc or desc"),
];

// ============================================
// GET REPLIES VALIDATION
// ============================================

export const validateGetReplies = [
    param("commentId")
        .isMongoId()
        .withMessage("Invalid comment ID"),
    
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
];

// ============================================
// EXPORTS
// ============================================

export default {
    validateCreateComment,
    validateUpdateComment,
    validateCommentId,
    validatePostId,
    validateReportComment,
    validateGetComments,
    validateGetReplies,
};