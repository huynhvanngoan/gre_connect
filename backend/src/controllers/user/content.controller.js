import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import Post from "../../models/post.model.js";

/**
 * @desc    Get user's posts
 * @route   GET /api/users/:userId/posts
 * @access  Private
 */
export const getUserPosts = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    const skip = (page - 1) * limit;
    
    const query = { author: userId, isActive: true };
    
    const posts = await Post.find(query)
        .populate("author", "firstName lastName username profilePicture role")
        .populate("targetClass", "name code")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);
    
    const total = await Post.countDocuments(query);
    
    res.status(200).json({
        success: true,
        data: posts,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get saved posts
 * @route   GET /api/users/me/saved-posts
 * @access  Private
 */
export const getSavedPosts = asyncHandler(async (req, res) => {
    const { limit = 20, page = 1 } = req.query;
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    const skip = (page - 1) * limit;
    
    const userWithSavedPosts = await User.findById(req.user._id)
        .populate({
            path: "savedPosts",
            options: {
                limit: parseInt(limit),
                skip: skip,
                sort: { createdAt: -1 }
            },
            populate: {
                path: "author",
                select: "firstName lastName username profilePicture role"
            }
        });
    
    const savedPosts = userWithSavedPosts.savedPosts;
    
    res.status(200).json({
        success: true,
        data: savedPosts,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: user.savedPosts.length,
            pages: Math.ceil(user.savedPosts.length / limit),
        },
    });
});

/**
 * @desc    Save a post
 * @route   POST /api/users/me/saved-posts/:postId
 * @access  Private
 */
export const savePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    const post = await Post.findById(postId);
    
    if (!post) {
        res.status(404);
        throw new Error("Post not found");
    }
    
    // Use model method if available, otherwise manual push
    if (typeof user.savePost === "function") {
        await user.savePost(postId);
    } else {
        if (user.savedPosts.includes(postId)) {
            res.status(400);
            throw new Error("Post is already saved");
        }
        user.savedPosts.push(postId);
        await user.save();
    }
    
    res.status(200).json({
        success: true,
        message: "Post saved successfully",
    });
});

/**
 * @desc    Unsave a post
 * @route   DELETE /api/users/me/saved-posts/:postId
 * @access  Private
 */
export const unsavePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Use model method if available, otherwise manual filter
    if (typeof user.unsavePost === "function") {
        await user.unsavePost(postId);
    } else {
        if (!user.savedPosts.includes(postId)) {
            res.status(400);
            throw new Error("Post is not saved");
        }
        user.savedPosts = user.savedPosts.filter(
            id => id.toString() !== postId
        );
        await user.save();
    }
    
    res.status(200).json({
        success: true,
        message: "Post unsaved successfully",
    });
});

