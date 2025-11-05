import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_STATUS, VISIBILITY_TYPES } from "../../utils/constants.js";
import { buildVisibilityQuery } from "./helpers.js";

/**
 * @desc    Search posts
 * @route   GET /api/posts/search
 * @access  Private
 */
export const searchPosts = asyncHandler(async (req, res) => {
    const { q, limit = 20, page = 1 } = req.query;

    if (!q) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Search query is required");
    }

    const skip = (page - 1) * limit;

    let posts;
    let total;

    if (req.user) {
        // User is authenticated - use visibility filtering
        posts = await Post.searchPosts(q, req.user)
            .limit(parseInt(limit))
            .skip(skip)
            .populate("user", "firstName lastName username profilePicture role");

        const searchRegex = new RegExp(q, "i");
        total = await Post.countDocuments({
            $or: [
                { content: searchRegex },
                { tags: searchRegex },
            ],
            status: POST_STATUS.PUBLISHED,
            isActive: true,
        });
    } else {
        // No user - show only public posts
        const searchRegex = new RegExp(q, "i");
        const query = {
            $or: [
                { content: searchRegex },
                { tags: searchRegex },
            ],
            status: POST_STATUS.PUBLISHED,
            isActive: true,
            visibility: VISIBILITY_TYPES.PUBLIC,
        };

        posts = await Post.find(query)
            .limit(parseInt(limit))
            .skip(skip)
            .populate("user", "firstName lastName username profilePicture role")
            .sort({ createdAt: -1 })
            .lean();

        total = await Post.countDocuments(query);
    }

    successResponse(res, HTTP_STATUS.OK, "Search results retrieved successfully", {
        posts,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get trending posts
 * @route   GET /api/posts/trending
 * @access  Private
 */
export const getTrendingPosts = asyncHandler(async (req, res) => {
    const { days = 7, limit = 20 } = req.query;

    const trendingPosts = await Post.findTrending(parseInt(days));

    // Populate user info
    await Post.populate(trendingPosts, {
        path: "user",
        select: "firstName lastName username profilePicture role",
    });

    successResponse(res, HTTP_STATUS.OK, "Trending posts retrieved successfully", {
        posts: trendingPosts.slice(0, parseInt(limit)),
    });
});

/**
 * @desc    Get trending topics/hashtags
 * @route   GET /api/posts/trending-topics
 * @access  Public
 */
export const getTrendingTopics = asyncHandler(async (req, res) => {
    const { limit = 20, days = 7 } = req.query;
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - parseInt(days));

    // Build visibility query
    let visibilityQuery = {};
    if (req.user) {
        visibilityQuery = buildVisibilityQuery(req.user);
    } else {
        visibilityQuery = { visibility: VISIBILITY_TYPES.PUBLIC };
    }

    // Aggregate to get trending topics from tags
    const trendingTopics = await Post.aggregate([
        {
            $match: {
                createdAt: { $gte: pastDate },
                status: POST_STATUS.PUBLISHED,
                isActive: true,
                tags: { $exists: true, $ne: [] },
                ...visibilityQuery,
            },
        },
        { $unwind: "$tags" },
        {
            $group: {
                _id: "$tags",
                count: { $sum: 1 },
                posts: { $addToSet: "$_id" },
            },
        },
        { $sort: { count: -1 } },
        { $limit: parseInt(limit) },
        {
            $project: {
                topic: "$_id",
                count: 1,
                postsCount: { $size: "$posts" },
                _id: 0,
            },
        },
    ]);

    successResponse(res, HTTP_STATUS.OK, "Trending topics retrieved successfully", {
        topics: trendingTopics,
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

    const posts = await Post.findByClass(classId)
        .limit(parseInt(limit))
        .skip(skip)
        .populate("user", "firstName lastName username profilePicture role");

    const total = await Post.countDocuments({
        $or: [
            { targetClass: classId },
            { targetClasses: classId },
        ],
        status: POST_STATUS.PUBLISHED,
        isActive: true,
    });

    successResponse(res, HTTP_STATUS.OK, "Class posts retrieved successfully", {
        posts,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get post analytics
 * @route   GET /api/posts/:postId/analytics
 * @access  Private (Post owner or staff)
 */
export const getPostAnalytics = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    // Check permission
    if (!post.user.equals(req.user._id) && req.user.role !== "staff") {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view analytics");
    }

    const analytics = await Post.getAnalytics(postId);

    successResponse(res, HTTP_STATUS.OK, "Analytics retrieved successfully", { analytics });
});

