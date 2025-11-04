import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Like or unlike a post
 * @route   POST /api/posts/:postId/like
 * @access  Private
 */
export const toggleLikePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await findOr404(Post, postId, "Post not found");

    // Check if already liked
    const isLiked = post.likes.some(id => id.toString() === userId.toString());

    if (isLiked) {
        // Unlike
        post.likes = post.likes.filter(id => !id.toString() === userId.toString());
        await post.save();

        successResponse(res, HTTP_STATUS.OK, "Post unliked", {
            isLiked: false,
            likesCount: post.likes.length,
        });
    } else {
        // Like
        post.likes.push(userId);
        await post.save();

        // Notify post author if not self
        if (!post.user.equals(userId)) {
            const { Notification } = await import("../../models/notification.model.js");
            await Notification.createNotification({
                recipientId: post.user,
                senderId: userId,
                type: NOTIFICATION_TYPES.POST_LIKE,
                title: "Post Liked",
                message: `${req.user.fullName} liked your post`,
                actionUrl: `/posts/${postId}`,
                postId: post._id,
            });
        }

        successResponse(res, HTTP_STATUS.OK, "Post liked", {
            isLiked: true,
            likesCount: post.likes.length,
        });
    }

    // Emit socket event
    const io = getIO();
    io.emit("post-like-toggled", {
        postId: post._id,
        isLiked: !isLiked,
        likesCount: post.likes.length,
    });
});

/**
 * @desc    Share a post
 * @route   POST /api/posts/:postId/share
 * @access  Private
 */
export const sharePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content, visibility } = req.body;
    const userId = req.user._id;

    const originalPost = await findOr404(Post, postId, "Post not found");

    // Create shared post
    const sharedPost = await Post.create({
        user: userId,
        content: content || "",
        postType: originalPost.postType,
        visibility: visibility || originalPost.visibility,
        sharedPost: originalPost._id,
        isShared: true,
    });

    // Increment share count
    originalPost.sharesCount = (originalPost.sharesCount || 0) + 1;
    await originalPost.save();

    await sharedPost.populate("user", "firstName lastName username profilePicture role");

    // Emit socket event
    const io = getIO();
    io.emit("post-shared", sharedPost);

    successResponse(res, HTTP_STATUS.CREATED, "Post shared successfully", { post: sharedPost });
});

/**
 * @desc    Report a post
 * @route   POST /api/posts/:postId/report
 * @access  Private
 */
export const reportPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user._id;

    const post = await findOr404(Post, postId, "Post not found");

    // Check if already reported by this user
    const existingReport = post.reports.find(r => r.user.toString() === userId.toString());
    if (existingReport) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "You have already reported this post");
    }

    // Add report
    post.reports.push({
        user: userId,
        reason,
        description,
        reportedAt: new Date(),
    });

    await post.save();

    successResponse(res, HTTP_STATUS.OK, "Post reported successfully");
});

