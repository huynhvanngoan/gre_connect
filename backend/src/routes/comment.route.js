import express from "express";
import {
    createComment,
    getComments,
    getCommentById,
    getReplies,
    updateComment,
    deleteComment,
    toggleLikeComment,
    reportComment,
    hideComment,
    getUserComments,
} from "../controllers/comment/index.js";

import {
    requireAuth,
    requireRole,
    checkBanned,
} from "../middlewares/auth.middleware.js";

import {
    validateCreateComment,
    validateUpdateComment,
    validateCommentId,
    validatePostId,
    validateReportComment,
    validateGetComments,
    validateGetReplies,
} from "../validations/comment.validation.js";

import { handleValidationErrors } from "../middlewares/validation.middleware.js";
import { uploadToCloudinary } from "../middlewares/upload.middleware.js";

const router = express.Router();

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(checkBanned);

// --------------------------------------------
// Comment CRUD Operations
// --------------------------------------------

/**
 * @route   POST /api/comments/:postId
 * @desc    Create a new comment on a post
 * @access  Private
 */
router.post(
    "/:postId",
    uploadToCloudinary.single("media"),
    validateCreateComment,
    handleValidationErrors,
    createComment
);

/**
 * @route   GET /api/comments/:postId
 * @desc    Get all comments for a post
 * @access  Private
 */
router.get(
    "/:postId",
    validateGetComments,
    handleValidationErrors,
    getComments
);

/**
 * @route   GET /api/comments/comment/:commentId
 * @desc    Get single comment by ID
 * @access  Private
 */
router.get(
    "/comment/:commentId",
    validateCommentId,
    handleValidationErrors,
    getCommentById
);

/**
 * @route   GET /api/comments/:commentId/replies
 * @desc    Get all replies for a comment
 * @access  Private
 */
router.get(
    "/:commentId/replies",
    validateGetReplies,
    handleValidationErrors,
    getReplies
);

/**
 * @route   PUT /api/comments/:commentId
 * @desc    Update comment
 * @access  Private (Comment owner)
 */
router.put(
    "/:commentId",
    validateUpdateComment,
    handleValidationErrors,
    updateComment
);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete comment
 * @access  Private (Comment owner or staff)
 */
router.delete(
    "/:commentId",
    validateCommentId,
    handleValidationErrors,
    deleteComment
);

// --------------------------------------------
// Comment Interactions
// --------------------------------------------

/**
 * @route   POST /api/comments/:commentId/like
 * @desc    Like or unlike a comment
 * @access  Private
 */
router.post(
    "/:commentId/like",
    validateCommentId,
    handleValidationErrors,
    toggleLikeComment
);

/**
 * @route   POST /api/comments/:commentId/report
 * @desc    Report a comment
 * @access  Private
 */
router.post(
    "/:commentId/report",
    validateReportComment,
    handleValidationErrors,
    reportComment
);

// --------------------------------------------
// Comment Moderation (Staff only)
// --------------------------------------------

/**
 * @route   POST /api/comments/:commentId/hide
 * @desc    Hide a comment
 * @access  Private (Staff)
 */
router.post(
    "/:commentId/hide",
    requireRole(["staff"]),
    validateCommentId,
    handleValidationErrors,
    hideComment
);

// --------------------------------------------
// User Comments
// --------------------------------------------

/**
 * @route   GET /api/comments/user/:userId
 * @desc    Get all comments by a user
 * @access  Private
 */
router.get(
    "/user/:userId",
    getUserComments
);

export default router;