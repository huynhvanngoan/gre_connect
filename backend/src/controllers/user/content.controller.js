import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import Post from "../../models/post.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

/**
 * @desc    Get user's posts
 * @route   GET /api/users/:userId/posts
 * @access  Private
 */
export const getUserPosts = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1, postType } = req.query;

    await findOr404(User, userId, "User not found");

    const skip = (page - 1) * limit;
    const query = { author: userId, isActive: true };

    if (postType) {
        query.postType = postType;
    }

    const posts = await Post.find(query)
        .populate("author", "firstName lastName username profilePicture role")
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 });

    const total = await Post.countDocuments(query);

    return createPaginatedResponse(
        res,
        HTTP_STATUS.OK,
        "User posts retrieved successfully",
        posts,
        total,
        page,
        limit
    );
});

/**
 * @desc    Get saved posts
 * @route   GET /api/users/me/saved-posts
 * @access  Private
 */
export const getSavedPosts = asyncHandler(async (req, res) => {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const user = await findOr404(User, req.user._id, "User not found");

    const savedPosts = await Post.find({
        _id: { $in: user.savedPosts }
    })
        .populate("author", "firstName lastName username profilePicture role")
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 });

    return createPaginatedResponse(
        res,
        HTTP_STATUS.OK,
        "Saved posts retrieved successfully",
        savedPosts,
        user.savedPosts.length,
        page,
        limit
    );
});

/**
 * @desc    Save a post
 * @route   POST /api/users/posts/:postId/save
 * @access  Private
 */
export const savePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const user = await findOr404(User, req.user._id, "User not found");

    await findOr404(Post, postId, "Post not found");

    await user.savePost(postId);

    successResponse(res, HTTP_STATUS.OK, "Post saved successfully", null);
});

/**
 * @desc    Unsave a post
 * @route   DELETE /api/users/posts/:postId/unsave
 * @access  Private
 */
export const unsavePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const user = await findOr404(User, req.user._id, "User not found");

    await user.unsavePost(postId);

    successResponse(res, HTTP_STATUS.OK, "Post unsaved successfully", null);
});

