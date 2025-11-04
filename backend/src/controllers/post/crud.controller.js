import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { Comment } from "../../models/comment.model.js";
import User from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_TYPES, POST_STATUS, VISIBILITY_TYPES, PERMISSIONS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";
import { findOr404, canAccessResource, createPaginatedResponse } from "../../utils/helpers.js";
import { canViewPost, canEditPost, canDeletePost, buildVisibilityQuery, sendPostNotifications, getCommentsCountMap } from "../../services/post.service.js";

/**
 * @desc    Create a new post
 * @route   POST /api/posts
 * @access  Private
 */
export const createPost = asyncHandler(async (req, res) => {
    const {
        content,
        postType = POST_TYPES.GENERAL,
        visibility = VISIBILITY_TYPES.PUBLIC,
        targetClass,
        targetClasses,
        tags,
        mentions,
        allowComments = true,
        allowLikes = true,
        allowSharing = true,
        scheduledFor,
        homeworkData,
        announcementData,
        pollData,
        eventData,
    } = req.body;

    const userId = req.user._id;

    // Check permissions based on post type
    if (postType === POST_TYPES.ANNOUNCEMENT && !req.user.hasPermission(PERMISSIONS.CREATE_ANNOUNCEMENT)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to create announcements");
    }

    if (postType === POST_TYPES.HOMEWORK && !req.user.hasPermission(PERMISSIONS.CREATE_HOMEWORK)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to create homework");
    }

    // Prepare post data
    const postData = {
        user: userId,
        content,
        postType,
        visibility,
        targetClass,
        targetClasses,
        tags,
        mentions,
        allowComments,
        allowLikes,
        allowSharing,
        scheduledFor,
        status: scheduledFor ? POST_STATUS.DRAFT : POST_STATUS.PUBLISHED,
    };

    // Add type-specific data
    if (postType === POST_TYPES.HOMEWORK && homeworkData) {
        postData.homeworkData = homeworkData;
    }

    if (postType === POST_TYPES.ANNOUNCEMENT && announcementData) {
        postData.announcementData = announcementData;
    }

    if (postType === POST_TYPES.POLL && pollData) {
        postData.pollData = pollData;
    }

    if (postType === POST_TYPES.EVENT && eventData) {
        postData.eventData = eventData;
    }

    // Handle uploaded files from middleware
    if (req.files) {
        if (req.files.images) {
            postData.images = req.files.images.map(file => ({
                url: file.path,
                caption: file.caption || "",
            }));
        }

        if (req.files.attachments) {
            postData.attachments = req.files.attachments.map(file => ({
                url: file.path,
                filename: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
            }));
        }
    }

    // Create post
    const post = await Post.create(postData);

    // Populate user info
    await post.populate("user", "firstName lastName username profilePicture role");

    // Send notifications
    await sendPostNotifications(post, req.user);

    // Emit socket event
    const io = getIO();
    io.emit("new-post", post);

    successResponse(res, HTTP_STATUS.CREATED, "Post created successfully", { post });
});

/**
 * @desc    Get all posts for feed
 * @route   GET /api/posts
 * @access  Private
 */
export const getPosts = asyncHandler(async (req, res) => {
    const {
        limit = 20,
        page = 1,
        postType,
        classId,
        userId,
        sortBy = "createdAt",
        order = "desc",
    } = req.query;

    const skip = (page - 1) * limit;

    // Build query
    const query = {
        status: POST_STATUS.PUBLISHED,
        isActive: true,
    };

    // Filter by post type
    if (postType) {
        query.postType = postType;
    }

    // Filter by class
    if (classId) {
        query.$or = [
            { targetClass: classId },
            { targetClasses: classId },
        ];
    }

    // Filter by user
    if (userId) {
        query.user = userId;
    }

    // Apply visibility rules based on user role
    // If no user (public access), only show public posts
    if (req.user) {
        const visibilityQuery = buildVisibilityQuery(req.user);
        Object.assign(query, visibilityQuery);
    } else {
        query.visibility = VISIBILITY_TYPES.PUBLIC;
    }

    // Get posts - use lean() for better performance
    const posts = await Post.find(query)
        .sort({ isPinned: -1, [sortBy]: order === "desc" ? -1 : 1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate("user", "firstName lastName username profilePicture role")
        .populate("targetClass", "name code")
        .populate("targetClasses", "name code")
        .lean();

    // Get total count
    const total = await Post.countDocuments(query);

    // Compute accurate commentsCount via aggregation (in case post.comments not maintained)
    const postIds = posts.map(p => p._id);
    const commentsCountMap = await getCommentsCountMap(postIds);

    // Add virtual fields
    const postsWithVirtuals = posts.map(post => ({
        ...post,
        commentsCount: commentsCountMap.get(post._id.toString()) || 0,
        isLiked: post.likes?.some(id => id.toString() === req.user?._id?.toString()) || false,
        likesCount: post.likes?.length || 0,
    }));

    createPaginatedResponse(res, HTTP_STATUS.OK, "Posts retrieved successfully", postsWithVirtuals, total, page, limit);
});

/**
 * @desc    Get single post by ID
 * @route   GET /api/posts/:postId
 * @access  Private
 */
export const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId)
        .populate("user", "firstName lastName username profilePicture role")
        .populate("targetClass", "name code")
        .populate("targetClasses", "name code");

    if (!post) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Post not found");
    }

    // Check if user can view this post
    if (!canViewPost(post, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to view this post");
    }

    // Get comments count
    const commentsCount = await Comment.countDocuments({ post: postId, isActive: true });

    // Convert to object and add virtual fields
    const postObject = post.toObject({ virtuals: true });
    postObject.commentsCount = commentsCount;
    postObject.isLiked = post.likes?.some(id => id.toString() === req.user._id.toString()) || false;
    postObject.likesCount = post.likes?.length || 0;

    successResponse(res, HTTP_STATUS.OK, "Post retrieved successfully", { post: postObject });
});

/**
 * @desc    Update a post
 * @route   PUT /api/posts/:postId
 * @access  Private
 */
export const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const {
        content,
        visibility,
        tags,
        mentions,
        allowComments,
        allowLikes,
        allowSharing,
    } = req.body;

    const post = await findOr404(Post, postId, "Post not found");

    // Check if user can edit
    if (!canEditPost(post, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to edit this post");
    }

    // Update fields
    if (content !== undefined) post.content = content;
    if (visibility !== undefined) post.visibility = visibility;
    if (tags !== undefined) post.tags = tags;
    if (mentions !== undefined) post.mentions = mentions;
    if (allowComments !== undefined) post.allowComments = allowComments;
    if (allowLikes !== undefined) post.allowLikes = allowLikes;
    if (allowSharing !== undefined) post.allowSharing = allowSharing;

    post.isEdited = true;
    await post.save();

    await post.populate("user", "firstName lastName username profilePicture role");

    // Emit socket event
    const io = getIO();
    io.emit("post-updated", post);

    successResponse(res, HTTP_STATUS.OK, "Post updated successfully", { post });
});

/**
 * @desc    Delete a post
 * @route   DELETE /api/posts/:postId
 * @access  Private
 */
export const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await findOr404(Post, postId, "Post not found");

    // Check if user can delete
    if (!canDeletePost(post, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to delete this post");
    }

    // Soft delete
    post.isActive = false;
    await post.save();

    // Emit socket event
    const io = getIO();
    io.emit("post-deleted", { postId: post._id });

    successResponse(res, HTTP_STATUS.OK, "Post deleted successfully");
});

