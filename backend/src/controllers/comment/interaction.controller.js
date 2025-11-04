import asyncHandler from "express-async-handler";
import { Comment } from "../../models/comment.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

/**
 * @desc    Like or unlike a comment
 * @route   POST /api/comments/:commentId/like
 * @access  Private
 */
export const toggleLikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await findOr404(Comment, commentId, "Comment not found");

    const isLiked = comment.likes.includes(userId);

    if (isLiked) {
        // Unlike
        comment.likes = comment.likes.filter(id => !id.equals(userId));
        await comment.save();

        successResponse(res, HTTP_STATUS.OK, "Comment unliked", {
            isLiked: false,
            likesCount: comment.likes.length,
        });
    } else {
        // Like
        comment.likes.push(userId);
        await comment.save();

        // Notify comment author if not self
        if (!comment.user.equals(userId)) {
            const { Notification } = await import("../../models/notification.model.js");
            const { NOTIFICATION_TYPES } = await import("../../utils/constants.js");
            await Notification.createNotification({
                recipientId: comment.user,
                senderId: userId,
                type: NOTIFICATION_TYPES.COMMENT_LIKE,
                title: "Comment Liked",
                message: `${req.user.fullName} liked your comment`,
                actionUrl: `/posts/${comment.post}`,
                commentId: comment._id,
            });
        }

        successResponse(res, HTTP_STATUS.OK, "Comment liked", {
            isLiked: true,
            likesCount: comment.likes.length,
        });
    }

    // Emit socket event
    const { getIO } = await import("../../config/socket.js");
    const io = getIO();
    io.to(`post-${comment.post}`).emit("comment-like-toggled", {
        commentId: comment._id,
        isLiked: !isLiked,
        likesCount: comment.likes.length,
    });
});

/**
 * @desc    Report a comment
 * @route   POST /api/comments/:commentId/report
 * @access  Private
 */
export const reportComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user._id;

    const comment = await findOr404(Comment, commentId, "Comment not found");

    // Check if already reported by this user
    const existingReport = comment.reports.find(r => r.user.equals(userId));
    if (existingReport) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "You have already reported this comment");
    }

    // Add report
    comment.reports.push({
        user: userId,
        reason,
        description,
        reportedAt: new Date(),
    });

    await comment.save();

    successResponse(res, HTTP_STATUS.OK, "Comment reported successfully");
});

/**
 * @desc    Hide a comment (for current user)
 * @route   POST /api/comments/:commentId/hide
 * @access  Private
 */
export const hideComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await findOr404(Comment, commentId, "Comment not found");

    // Add to user's hidden comments if not already hidden
    if (!comment.hiddenBy.includes(userId)) {
        comment.hiddenBy.push(userId);
        await comment.save();
    }

    successResponse(res, HTTP_STATUS.OK, "Comment hidden successfully");
});

/**
 * @desc    Get comments by a specific user
 * @route   GET /api/comments/user/:userId
 * @access  Private
 */
export const getUserComments = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const comments = await Comment.find({ user: userId, isActive: true })
        .populate("post", "title content")
        .populate("user", "firstName lastName username profilePicture role")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean();

    const total = await Comment.countDocuments({ user: userId, isActive: true });

    createPaginatedResponse(res, HTTP_STATUS.OK, "User comments retrieved successfully", comments, total, page, limit);
});

