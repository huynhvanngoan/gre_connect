import asyncHandler from "express-async-handler";
import { Comment } from "../../models/comment.model.js";
import Post from "../../models/post.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

/**
 * @desc    Create a new comment on a post
 * @route   POST /api/comments/:postId
 * @access  Private
 */
export const createComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content, commentType, parentComment, mentions } = req.body;
    const userId = req.user._id;

    const post = await findOr404(Post, postId, "Post not found");

    // Check if comments are allowed
    if (!post.allowComments) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Comments are disabled for this post");
    }

    // Prepare comment data
    const commentData = {
        post: postId,
        user: userId,
        content,
        commentType: commentType || "text",
        parentComment,
        mentions,
    };

    // Handle media if uploaded
    if (req.file) {
        commentData.media = {
            url: req.file.path,
            type: req.file.mimetype.startsWith("image/") ? "image" : "file",
            fileName: req.file.originalname,
            fileSize: req.file.size,
        };
    }

    // Create comment
    const comment = await Comment.create(commentData);

    // Populate user info
    await comment.populate("user", "firstName lastName username profilePicture role");

    // If it's a reply, add to parent's replies
    if (parentComment) {
        const parentCommentDoc = await Comment.findById(parentComment);
        if (parentCommentDoc) {
            parentCommentDoc.replies.push(comment._id);
            await parentCommentDoc.save();

            // Notify parent comment author
            if (!parentCommentDoc.user.equals(userId)) {
                const { Notification } = await import("../../models/notification.model.js");
                const { NOTIFICATION_TYPES } = await import("../../utils/constants.js");
                await Notification.createNotification({
                    recipientId: parentCommentDoc.user,
                    senderId: userId,
                    type: NOTIFICATION_TYPES.COMMENT_REPLY,
                    title: "New Reply",
                    message: `${req.user.fullName} replied to your comment`,
                    actionUrl: `/posts/${postId}`,
                    commentId: comment._id,
                });
            }
        }
    } else {
        // Notify post author
        if (!post.user.equals(userId)) {
            const { Notification } = await import("../../models/notification.model.js");
            const { NOTIFICATION_TYPES } = await import("../../utils/constants.js");
            await Notification.createNotification({
                recipientId: post.user,
                senderId: userId,
                type: NOTIFICATION_TYPES.POST_COMMENT,
                title: "New Comment",
                message: `${req.user.fullName} commented on your post`,
                actionUrl: `/posts/${postId}`,
                commentId: comment._id,
            });
        }
    }

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
        const { Notification } = await import("../../models/notification.model.js");
        const { NOTIFICATION_TYPES } = await import("../../utils/constants.js");
        const { getIO } = await import("../../config/socket.js");
        const io = getIO();

        for (const mentionedUserId of mentions) {
            if (mentionedUserId !== userId.toString()) {
                await Notification.createNotification({
                    recipientId: mentionedUserId,
                    senderId: userId,
                    type: NOTIFICATION_TYPES.MENTION,
                    title: "You were mentioned",
                    message: `${req.user.fullName} mentioned you in a comment`,
                    actionUrl: `/posts/${postId}`,
                    commentId: comment._id,
                });

                io.to(mentionedUserId).emit("notification", {
                    type: NOTIFICATION_TYPES.MENTION,
                    message: `${req.user.fullName} mentioned you`,
                });
            }
        }
    }

    // Emit socket event
    const { getIO } = await import("../../config/socket.js");
    const io = getIO();
    io.to(`post-${postId}`).emit("new-comment", comment);

    successResponse(res, HTTP_STATUS.CREATED, "Comment created successfully", { comment });
});

/**
 * @desc    Get comments for a post
 * @route   GET /api/comments/:postId
 * @access  Private
 */
export const getComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 20, sort = "newest" } = req.query;
    const userId = req.user._id;

    const post = await findOr404(Post, postId, "Post not found");

    const skip = (page - 1) * limit;
    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const comments = await Comment.find({ post: postId, parentComment: null, isActive: true })
        .populate("user", "firstName lastName username profilePicture role")
        .populate({
            path: "replies",
            populate: {
                path: "user",
                select: "firstName lastName username profilePicture role"
            },
            options: { sort: { createdAt: 1 } }
        })
        .sort(sortOption)
        .limit(parseInt(limit))
        .skip(skip)
        .lean();

    const total = await Comment.countDocuments({ post: postId, parentComment: null, isActive: true });

    createPaginatedResponse(res, HTTP_STATUS.OK, "Comments retrieved successfully", comments, total, page, limit);
});

/**
 * @desc    Get single comment by ID
 * @route   GET /api/comments/comment/:commentId
 * @access  Private
 */
export const getCommentById = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId)
        .populate("user", "firstName lastName username profilePicture role")
        .populate({
            path: "replies",
            populate: {
                path: "user",
                select: "firstName lastName username profilePicture role"
            }
        })
        .populate("parentComment", "content user");

    if (!comment) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Comment not found");
    }

    successResponse(res, HTTP_STATUS.OK, "Comment retrieved successfully", { comment });
});

/**
 * @desc    Get replies to a comment
 * @route   GET /api/comments/:commentId/replies
 * @access  Private
 */
export const getReplies = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const parentComment = await findOr404(Comment, commentId, "Comment not found");

    const skip = (page - 1) * limit;

    const replies = await Comment.find({ parentComment: commentId, isActive: true })
        .populate("user", "firstName lastName username profilePicture role")
        .sort({ createdAt: 1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean();

    const total = await Comment.countDocuments({ parentComment: commentId, isActive: true });

    createPaginatedResponse(res, HTTP_STATUS.OK, "Replies retrieved successfully", replies, total, page, limit);
});

/**
 * @desc    Update a comment
 * @route   PUT /api/comments/:commentId
 * @access  Private
 */
export const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const comment = await findOr404(Comment, commentId, "Comment not found");

    // Check if user owns the comment
    if (!comment.user.equals(userId) && req.user.role !== "admin" && req.user.role !== "staff") {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You can only edit your own comments");
    }

    // Update comment
    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    await comment.populate("user", "firstName lastName username profilePicture role");

    // Emit socket event
    const { getIO } = await import("../../config/socket.js");
    const io = getIO();
    io.to(`post-${comment.post}`).emit("comment-updated", comment);

    successResponse(res, HTTP_STATUS.OK, "Comment updated successfully", { comment });
});

/**
 * @desc    Delete a comment
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
export const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await findOr404(Comment, commentId, "Comment not found");

    // Check if user owns the comment or is admin/staff
    if (!comment.user.equals(userId) && req.user.role !== "admin" && req.user.role !== "staff") {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You can only delete your own comments");
    }

    // Soft delete
    comment.isActive = false;
    await comment.save();

    // Emit socket event
    const { getIO } = await import("../../config/socket.js");
    const io = getIO();
    io.to(`post-${comment.post}`).emit("comment-deleted", { commentId: comment._id });

    successResponse(res, HTTP_STATUS.OK, "Comment deleted successfully");
});

