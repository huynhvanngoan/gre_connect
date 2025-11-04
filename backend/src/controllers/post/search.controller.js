import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_STATUS } from "../../utils/constants.js";
import { createPaginatedResponse } from "../../utils/helpers.js";
import { buildVisibilityQuery } from "../../services/post.service.js";

/**
 * @desc    Search posts
 * @route   GET /api/posts/search
 * @access  Private
 */
export const searchPosts = asyncHandler(async (req, res) => {
    const { q, limit = 20, page = 1, postType, classId } = req.query;
    const skip = (page - 1) * limit;

    if (!q || q.trim().length === 0) {
        return successResponse(res, HTTP_STATUS.OK, "Posts retrieved successfully", {
            posts: [],
            pagination: createPaginatedResponse([], { total: 0, page, limit }).pagination,
        });
    }

    const query = {
        $text: { $search: q },
        status: POST_STATUS.PUBLISHED,
        isActive: true,
    };

    if (postType) {
        query.postType = postType;
    }

    if (classId) {
        query.$or = [
            { targetClass: classId },
            { targetClasses: classId },
        ];
    }

    // Apply visibility rules
    if (req.user) {
        const visibilityQuery = buildVisibilityQuery(req.user);
        Object.assign(query, visibilityQuery);
    } else {
        query.visibility = "public";
    }

    const posts = await Post.find(query, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate("user", "firstName lastName username profilePicture role")
        .populate("targetClass", "name code")
        .lean();

    const total = await Post.countDocuments(query);

    const pagination = createPaginatedResponse(posts, { total, page, limit });

    successResponse(res, HTTP_STATUS.OK, "Posts retrieved successfully", {
        posts: pagination.data,
        pagination: pagination.pagination,
    });
});

/**
 * @desc    Get trending posts
 * @route   GET /api/posts/trending
 * @access  Private
 */
export const getTrendingPosts = asyncHandler(async (req, res) => {
    const { limit = 20, days = 7 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const query = {
        status: POST_STATUS.PUBLISHED,
        isActive: true,
        createdAt: { $gte: cutoffDate },
    };

    // Apply visibility rules
    if (req.user) {
        const visibilityQuery = buildVisibilityQuery(req.user);
        Object.assign(query, visibilityQuery);
    } else {
        query.visibility = "public";
    }

    const posts = await Post.find(query)
        .sort({ likesCount: -1, commentsCount: -1, sharesCount: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .populate("user", "firstName lastName username profilePicture role")
        .populate("targetClass", "name code")
        .lean();

    successResponse(res, HTTP_STATUS.OK, "Trending posts retrieved successfully", {
        posts,
    });
});

/**
 * @desc    Get trending topics
 * @route   GET /api/posts/trending-topics
 * @access  Private
 */
export const getTrendingTopics = asyncHandler(async (req, res) => {
    const { limit = 10, days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const query = {
        status: POST_STATUS.PUBLISHED,
        isActive: true,
        createdAt: { $gte: cutoffDate },
        tags: { $exists: true, $ne: [] },
    };

    // Apply visibility rules
    if (req.user) {
        const visibilityQuery = buildVisibilityQuery(req.user);
        Object.assign(query, visibilityQuery);
    } else {
        query.visibility = "public";
    }

    const posts = await Post.find(query).select("tags").lean();

    // Count tag frequency
    const tagCounts = {};
    posts.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
            post.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    // Sort by frequency and get top tags
    const trendingTopics = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, parseInt(limit))
        .map(([tag, count]) => ({ tag, count }));

    successResponse(res, HTTP_STATUS.OK, "Trending topics retrieved successfully", {
        topics: trendingTopics,
    });
});

