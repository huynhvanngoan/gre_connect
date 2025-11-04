import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

/**
 * @desc    Pin or unpin a post
 * @route   PUT /api/posts/:postId/pin
 * @access  Private (Admin/Staff)
 */
export const togglePinPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (req.user.role !== "admin" && req.user.role !== "staff") {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins and staff can pin posts");
    }

    const post = await findOr404(Post, postId, "Post not found");

    post.isPinned = !post.isPinned;
    await post.save();

    // Emit socket event
    const io = getIO();
    io.emit("post-pin-toggled", {
        postId: post._id,
        isPinned: post.isPinned,
    });

    successResponse(res, HTTP_STATUS.OK, `Post ${post.isPinned ? 'pinned' : 'unpinned'} successfully`, {
        isPinned: post.isPinned,
    });
});

/**
 * @desc    Get posts by class
 * @route   GET /api/posts/class/:classId
 * @access  Private
 */
export const getPostsByClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const posts = await Post.find({
        $or: [
            { targetClass: classId },
            { targetClasses: classId },
        ],
        status: "published",
        isActive: true,
    })
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate("user", "firstName lastName username profilePicture role")
        .lean();

    const total = await Post.countDocuments({
        $or: [
            { targetClass: classId },
            { targetClasses: classId },
        ],
        status: "published",
        isActive: true,
    });

    createPaginatedResponse(res, HTTP_STATUS.OK, "Class posts retrieved successfully", posts, total, page, limit);
});

/**
 * @desc    Get post analytics
 * @route   GET /api/posts/:postId/analytics
 * @access  Private (Post owner or Admin)
 */
export const getPostAnalytics = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await findOr404(Post, postId, "Post not found");

    // Check if user is owner or admin
    if (!post.user.equals(userId) && req.user.role !== "admin" && req.user.role !== "staff") {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    const analytics = {
        likesCount: post.likes?.length || 0,
        commentsCount: post.comments?.length || 0,
        sharesCount: post.sharesCount || 0,
        viewsCount: post.viewsCount || 0,
    };

    successResponse(res, HTTP_STATUS.OK, "Post analytics retrieved successfully", { analytics });
});

