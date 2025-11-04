import express from "express";
import {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    toggleLikePost,
    sharePost,
    togglePinPost,
    reportPost,
    submitHomework,
    gradeHomework,
    getHomeworkSubmissions,
    acknowledgeAnnouncement,
    votePoll,
    getPollResults,
    rsvpEvent,
    getEventAttendees,
    searchPosts,
    getTrendingPosts,
    getTrendingTopics,
    getPostsByClass,
    getPostAnalytics,
} from "../controllers/post.controller.js";

import {
    requireAuth,
    optionalAuth,
    requireRole,
    requirePermission,
    checkBanned,
} from "../middlewares/auth.middleware.js";

import {
    validateCreatePost,
    validateUpdatePost,
    validateHomeworkPost,
    validateHomeworkSubmission,
    validateGradeHomework,
    validateAnnouncementPost,
    validatePollPost,
    validateVotePoll,
    validateEventPost,
    validateEventRSVP,
    validatePostId,
    validateReportPost,
    validatePinPost,
    validateSearchPosts,
    validatePagination,
    validateAcknowledge,
} from "../validations/post.validation.js";

import { handleValidationErrors } from "../middlewares/validation.middleware.js";
import { uploadToCloudinary } from "../middlewares/upload.middleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES (with optional auth)
// ============================================

// Public routes - no authentication required (temporary for testing)
router.get(
    "/",
    optionalAuth,
    validatePagination,
    handleValidationErrors,
    getPosts
);

router.get(
    "/search",
    validateSearchPosts,
    handleValidationErrors,
    searchPosts
);

router.get(
    "/trending",
    getTrendingPosts
);

router.get(
    "/trending-topics",
    getTrendingTopics
);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Apply authentication middleware to all routes below
// Temporarily commented for testing - uncomment when ready
// router.use(requireAuth);
// router.use(checkBanned);

// --------------------------------------------
// General Post Routes
// --------------------------------------------

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post(
    "/",
    uploadToCloudinary.fields([
        { name: "images", maxCount: 10 },
        { name: "video", maxCount: 1 },
        { name: "attachments", maxCount: 5 },
    ]),
    validateCreatePost,
    handleValidationErrors,
    createPost
);

/**
 * @route   GET /api/posts/class/:classId
 * @desc    Get posts by class
 * @access  Private
 */
router.get(
    "/class/:classId",
    validatePostId,
    handleValidationErrors,
    getPostsByClass
);

/**
 * @route   GET /api/posts/:postId
 * @desc    Get single post by ID
 * @access  Private
 */
router.get(
    "/:postId",
    optionalAuth,
    validatePostId,
    handleValidationErrors,
    getPostById
);

/**
 * @route   PUT /api/posts/:postId
 * @desc    Update post
 * @access  Private (Post owner or staff)
 */
router.put(
    "/:postId",
    uploadToCloudinary.fields([
        { name: "images", maxCount: 10 },
        { name: "video", maxCount: 1 },
        { name: "attachments", maxCount: 5 },
    ]),
    validateUpdatePost,
    handleValidationErrors,
    updatePost
);

/**
 * @route   DELETE /api/posts/:postId
 * @desc    Delete post
 * @access  Private (Post owner or staff)
 */
router.delete(
    "/:postId",
    validatePostId,
    handleValidationErrors,
    deletePost
);

/**
 * @route   GET /api/posts/:postId/analytics
 * @desc    Get post analytics
 * @access  Private (Post owner or staff)
 */
router.get(
    "/:postId/analytics",
    validatePostId,
    handleValidationErrors,
    getPostAnalytics
);

// --------------------------------------------
// Post Interactions
// --------------------------------------------

/**
 * @route   POST /api/posts/:postId/like
 * @desc    Like or unlike a post
 * @access  Private
 */
router.post(
    "/:postId/like",
    optionalAuth, // Try to get user if token provided, but don't require it
    validatePostId,
    handleValidationErrors,
    toggleLikePost
);

/**
 * @route   POST /api/posts/:postId/share
 * @desc    Share a post
 * @access  Private
 */
router.post(
    "/:postId/share",
    validatePostId,
    handleValidationErrors,
    sharePost
);

/**
 * @route   POST /api/posts/:postId/report
 * @desc    Report a post
 * @access  Private
 */
router.post(
    "/:postId/report",
    validateReportPost,
    handleValidationErrors,
    reportPost
);

// --------------------------------------------
// Post Moderation (Teachers & Staff)
// --------------------------------------------

/**
 * @route   POST /api/posts/:postId/pin
 * @desc    Pin or unpin a post
 * @access  Private (Teachers & Staff)
 */
router.post(
    "/:postId/pin",
    requireRole(["teacher", "staff"]),
    requirePermission("pin_post"),
    validatePinPost,
    handleValidationErrors,
    togglePinPost
);

// --------------------------------------------
// Homework Routes
// --------------------------------------------

/**
 * @route   POST /api/posts/homework
 * @desc    Create homework post
 * @access  Private (Teachers)
 */
router.post(
    "/homework",
    requireRole(["teacher", "staff"]),
    requirePermission("create_homework"),
    uploadToCloudinary.fields([
        { name: "attachments", maxCount: 5 },
    ]),
    validateHomeworkPost,
    handleValidationErrors,
    createPost
);

/**
 * @route   POST /api/posts/:postId/submit
 * @desc    Submit homework
 * @access  Private (Students)
 */
router.post(
    "/:postId/submit",
    requireRole(["student"]),
    uploadToCloudinary.fields([
        { name: "attachments", maxCount: 5 },
    ]),
    validateHomeworkSubmission,
    handleValidationErrors,
    submitHomework
);

/**
 * @route   POST /api/posts/:postId/grade/:studentId
 * @desc    Grade homework submission
 * @access  Private (Teachers)
 */
router.post(
    "/:postId/grade/:studentId",
    requireRole(["teacher", "staff"]),
    requirePermission("grade_homework"),
    validateGradeHomework,
    handleValidationErrors,
    gradeHomework
);

/**
 * @route   GET /api/posts/:postId/submissions
 * @desc    Get homework submissions
 * @access  Private (Teachers)
 */
router.get(
    "/:postId/submissions",
    requireRole(["teacher", "staff"]),
    validatePostId,
    handleValidationErrors,
    getHomeworkSubmissions
);

// --------------------------------------------
// Announcement Routes
// --------------------------------------------

/**
 * @route   POST /api/posts/announcement
 * @desc    Create announcement post
 * @access  Private (Teachers & Staff)
 */
router.post(
    "/announcement",
    requireRole(["teacher", "staff"]),
    requirePermission("create_announcement"),
    uploadToCloudinary.fields([
        { name: "images", maxCount: 5 },
        { name: "attachments", maxCount: 3 },
    ]),
    validateAnnouncementPost,
    handleValidationErrors,
    createPost
);

/**
 * @route   POST /api/posts/:postId/acknowledge
 * @desc    Acknowledge announcement
 * @access  Private
 */
router.post(
    "/:postId/acknowledge",
    validateAcknowledge,
    handleValidationErrors,
    acknowledgeAnnouncement
);

// --------------------------------------------
// Poll Routes
// --------------------------------------------

/**
 * @route   POST /api/posts/poll
 * @desc    Create poll post
 * @access  Private
 */
router.post(
    "/poll",
    validatePollPost,
    handleValidationErrors,
    createPost
);

/**
 * @route   POST /api/posts/:postId/vote
 * @desc    Vote on poll
 * @access  Private
 */
router.post(
    "/:postId/vote",
    validateVotePoll,
    handleValidationErrors,
    votePoll
);

/**
 * @route   GET /api/posts/:postId/poll-results
 * @desc    Get poll results
 * @access  Private
 */
router.get(
    "/:postId/poll-results",
    validatePostId,
    handleValidationErrors,
    getPollResults
);

// --------------------------------------------
// Event Routes
// --------------------------------------------

/**
 * @route   POST /api/posts/event
 * @desc    Create event post
 * @access  Private
 */
router.post(
    "/event",
    uploadToCloudinary.fields([
        { name: "images", maxCount: 5 },
    ]),
    validateEventPost,
    handleValidationErrors,
    createPost
);

/**
 * @route   POST /api/posts/:postId/rsvp
 * @desc    RSVP to event
 * @access  Private
 */
router.post(
    "/:postId/rsvp",
    validateEventRSVP,
    handleValidationErrors,
    rsvpEvent
);

/**
 * @route   GET /api/posts/:postId/attendees
 * @desc    Get event attendees
 * @access  Private
 */
router.get(
    "/:postId/attendees",
    validatePostId,
    handleValidationErrors,
    getEventAttendees
);

export default router;