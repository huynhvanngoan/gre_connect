import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, PERMISSIONS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Like or unlike a post
 * @route   POST /api/posts/:postId/like
 * @access  Private
 */
export const toggleLikePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!req.user || !req.user._id) {
        res.status(HTTP_STATUS.UNAUTHORIZED);
        throw new Error("Authentication required. Please log in to like posts.");
    }

    const userId = req.user._id;
    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (!post.allowLikes) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Likes are disabled for this post");
    }

    const liked = await post.toggleLike(userId);

    // Send notification if liked
    if (liked && !post.user.equals(userId)) {
        try {
            await Notification.createNotification({
                recipientId: post.user,
                senderId: userId,
                type: NOTIFICATION_TYPES.POST_LIKE,
                title: "New Like",
                message: `${req.user.firstName} ${req.user.lastName} liked your post`,
                actionUrl: `/posts/${postId}`,
                postId: postId,
            });

            // Emit socket event
            const io = getIO();
            io.to(post.user.toString()).emit("new-like", {
                postId,
                user: {
                    _id: req.user._id,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName,
                    username: req.user.username,
                    profilePicture: req.user.profilePicture,
                },
            });
        } catch (notifError) {
            console.error('[toggleLikePost] Failed to send notification:', notifError);
        }
    }

    // Reload post to get updated data
    const updatedPost = await Post.findById(postId).lean();

    successResponse(res, HTTP_STATUS.OK, liked ? "Post liked" : "Post unliked", {
        liked,
        likesCount: updatedPost?.likesCount || updatedPost?.likes?.length || 0,
    });
});

/**
 * @desc    Share a post
 * @route   POST /api/posts/:postId/share
 * @access  Private
 */
export const sharePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (!post.allowSharing) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Sharing is disabled for this post");
    }

    await post.share(userId);

    // Send notification
    if (!post.user.equals(userId)) {
        await Notification.createNotification({
            recipientId: post.user,
            senderId: userId,
            type: NOTIFICATION_TYPES.POST_SHARE,
            title: "Post Shared",
            message: `${req.user.fullName} shared your post`,
            actionUrl: `/posts/${postId}`,
            postId: postId,
        });
    }

    successResponse(res, HTTP_STATUS.OK, "Post shared successfully", {
        sharesCount: post.sharesCount,
    });
});

/**
 * @desc    Pin or unpin a post
 * @route   POST /api/posts/:postId/pin
 * @access  Private (Teachers/Staff)
 */
export const togglePinPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { pinnedUntil } = req.body;

    if (!req.user.hasPermission(PERMISSIONS.PIN_POST)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to pin posts");
    }

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    await post.togglePin(pinnedUntil);

    successResponse(res, HTTP_STATUS.OK, post.isPinned ? "Post pinned" : "Post unpinned", {
        isPinned: post.isPinned,
        pinnedUntil: post.pinnedUntil,
    });
});

/**
 * @desc    Report a post
 * @route   POST /api/posts/:postId/report
 * @access  Private
 */
export const reportPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    await post.report(userId, reason);

    // Notify staff/admin
    const staffUsers = await User.find({ role: "staff", isActive: true });

    for (const staff of staffUsers) {
        await Notification.createNotification({
            recipientId: staff._id,
            senderId: userId,
            type: NOTIFICATION_TYPES.SYSTEM_UPDATE,
            title: "Post Reported",
            message: `A post has been reported: ${reason}`,
            actionUrl: `/posts/${postId}`,
            postId: postId,
            priority: "high",
        });
    }

    successResponse(res, HTTP_STATUS.OK, "Post reported successfully");
});

