import asyncHandler from "express-async-handler";
import { Comment } from "../../models/comment.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES } from "../../utils/constants.js";

/**
 * @desc    Like or unlike a comment
 * @route   POST /api/comments/:commentId/like
 * @access  Private
 */
export const toggleLikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Comment not found");
    }

    const liked = await comment.toggleLike(userId);

    // Send notification if liked
    if (liked && !comment.user.equals(userId)) {
        await Notification.createNotification({
            recipientId: comment.user,
            senderId: userId,
            type: NOTIFICATION_TYPES.COMMENT_LIKE,
            title: "Comment Liked",
            message: `${req.user.fullName} liked your comment`,
            actionUrl: `/posts/${comment.post}`,
            commentId: commentId,
        });
    }

    successResponse(res, HTTP_STATUS.OK, liked ? "Comment liked" : "Comment unliked", {
        liked,
        likesCount: comment.likesCount,
    });
});

/**
 * @desc    Report a comment
 * @route   POST /api/comments/:commentId/report
 * @access  Private
 */
export const reportComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { reason } = req.body;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Comment not found");
    }

    await comment.report(req.user._id, reason);

    successResponse(res, HTTP_STATUS.OK, "Comment reported successfully");
});

/**
 * @desc    Hide a comment
 * @route   POST /api/comments/:commentId/hide
 * @access  Private (Staff)
 */
export const hideComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { reason } = req.body;

    if (req.user.role !== "staff") {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Only staff can hide comments");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Comment not found");
    }

    await comment.hide(reason);

    successResponse(res, HTTP_STATUS.OK, "Comment hidden successfully");
});

