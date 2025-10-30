import asyncHandler from "express-async-handler";
import { Comment } from "../models/comment.model.js";
import Post from "../models/post.model.js";
import { Notification } from "../models/notification.model.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES } from "../utils/constants.js";
import { getIO } from "../config/socket.js";

// ============================================
// CREATE COMMENT
// ============================================

/**
 * @desc    Create a new comment on a post
 * @route   POST /api/comments/:postId
 * @access  Private
 */
export const createComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content, commentType, parentComment, mentions } = req.body;
    const userId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    // Check if comments are allowed
    if (!post.allowComments) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Comments are disabled for this post");
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
        for (const mentionedUserId of mentions) {
            if (!mentionedUserId.equals(userId)) {
                await Notification.createNotification({
                    recipientId: mentionedUserId,
                    senderId: userId,
                    type: NOTIFICATION_TYPES.COMMENT_MENTION,
                    title: "Mentioned in Comment",
                    message: `${req.user.fullName} mentioned you in a comment`,
                    actionUrl: `/posts/${postId}`,
                    commentId: comment._id,
                });
            }
        }
    }

    // Emit socket event
    const io = getIO();
    io.to(`post-${postId}`).emit("new-comment", comment);

    successResponse(res, HTTP_STATUS.CREATED, "Comment created successfully", { comment });
});

// ============================================
// GET COMMENTS
// ============================================

/**
 * @desc    Get all comments for a post
 * @route   GET /api/comments/:postId
 * @access  Private
 */
export const getComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const {
        limit = 20,
        page = 1,
        sortBy = "createdAt",
        order = "desc",
    } = req.query;

    const skip = (page - 1) * limit;

    // Check if post exists
    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    // Get top-level comments (no parent)
    const comments = await Comment.find({
        post: postId,
        parentComment: null,
        isActive: true,
        isHidden: false,
    })
        .sort({ [sortBy]: order === "desc" ? -1 : 1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate("user", "firstName lastName username profilePicture role")
        .populate({
            path: "replies",
            options: { limit: 3, sort: { createdAt: 1 } },
            populate: {
                path: "user",
                select: "firstName lastName username profilePicture role",
            },
        })
        .lean();

    // Get total count
    const total = await Comment.countDocuments({
        post: postId,
        parentComment: null,
        isActive: true,
        isHidden: false,
    });

    // Add virtual fields
    const commentsWithVirtuals = comments.map(comment => ({
        ...comment,
        likesCount: comment.likes?.length || 0,
        repliesCount: comment.replies?.length || 0,
        isLiked: comment.likes?.some(id => id.toString() === req.user._id.toString()) || false,
    }));

    successResponse(res, HTTP_STATUS.OK, "Comments retrieved successfully", {
        comments: commentsWithVirtuals,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

// ============================================
// GET COMMENT BY ID
// ============================================

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
                select: "firstName lastName username profilePicture role",
            },
        })
        .populate("mentions", "firstName lastName username profilePicture");

    if (!comment) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Comment not found");
    }

    if (!comment.isActive || comment.isHidden) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Comment is not available");
    }

    // Convert to object and add virtual fields
    const commentObject = comment.toObject({ virtuals: true });
    commentObject.isLiked = comment.likes.some(id => id.toString() === req.user._id.toString());

    successResponse(res, HTTP_STATUS.OK, "Comment retrieved successfully", { comment: commentObject });
});

// ============================================
// GET REPLIES
// ============================================

/**
 * @desc    Get all replies for a comment
 * @route   GET /api/comments/:commentId/replies
 * @access  Private
 */
export const getReplies = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { limit = 20 } = req.query;

    const replies = await Comment.findReplies(commentId)
        .limit(parseInt(limit))
        .lean();

    // Add virtual fields
    const repliesWithVirtuals = replies.map(reply => ({
        ...reply,
        likesCount: reply.likes?.length || 0,
        isLiked: reply.likes?.some(id => id.toString() === req.user._id.toString()) || false,
    }));

    successResponse(res, HTTP_STATUS.OK, "Replies retrieved successfully", {
        replies: repliesWithVirtuals,
        count: replies.length,
    });
});

// ============================================
// UPDATE COMMENT
// ============================================

/**
 * @desc    Update comment
 * @route   PUT /api/comments/:commentId
 * @access  Private
 */
export const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Comment not found");
    }

    // Check ownership
    if (!comment.user.equals(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You can only edit your own comments");
    }

    // Update with history
    await comment.updateContent(content);

    await comment.populate("user", "firstName lastName username profilePicture role");

    successResponse(res, HTTP_STATUS.OK, "Comment updated successfully", { comment });
});

// ============================================
// DELETE COMMENT
// ============================================

/**
 * @desc    Delete comment
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
export const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Comment not found");
    }

    // Check ownership or staff permission
    if (!comment.user.equals(userId) && req.user.role !== "staff") {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to delete this comment");
    }

    // Soft delete
    comment.isActive = false;
    await comment.save();

    // Or hard delete:
    // await comment.deleteOne();

    successResponse(res, HTTP_STATUS.OK, "Comment deleted successfully");
});

// ============================================
// LIKE/UNLIKE COMMENT
// ============================================

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

// ============================================
// REPORT COMMENT
// ============================================

/**
 * @desc    Report a comment
 * @route   POST /api/comments/:commentId/report
 * @access  Private
 */
export const reportComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Comment not found");
    }

    await comment.report(userId, reason);

    successResponse(res, HTTP_STATUS.OK, "Comment reported successfully");
});

// ============================================
// HIDE COMMENT (Staff only)
// ============================================

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

// ============================================
// GET USER'S COMMENTS
// ============================================

/**
 * @desc    Get all comments by a user
 * @route   GET /api/comments/user/:userId
 * @access  Private
 */
export const getUserComments = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const comments = await Comment.findByUser(userId)
        .limit(parseInt(limit))
        .skip(skip)
        .populate("post", "content postType")
        .lean();

    const total = await Comment.countDocuments({
        user: userId,
        isActive: true,
    });

    // Add virtual fields
    const commentsWithVirtuals = comments.map(comment => ({
        ...comment,
        likesCount: comment.likes?.length || 0,
        repliesCount: comment.replies?.length || 0,
    }));

    successResponse(res, HTTP_STATUS.OK, "User comments retrieved successfully", {
        comments: commentsWithVirtuals,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

export default {
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
};