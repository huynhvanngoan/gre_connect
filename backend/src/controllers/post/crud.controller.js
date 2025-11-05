import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { Comment } from "../../models/comment.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_STATUS, POST_TYPES, VISIBILITY_TYPES, PERMISSIONS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";
import { buildVisibilityQuery, canViewPost, canEditPost, canDeletePost } from "./helpers.js";
import { sendPostNotifications } from "./helpers.js";

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
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to create announcements");
    }

    if (postType === POST_TYPES.HOMEWORK && !req.user.hasPermission(PERMISSIONS.CREATE_HOMEWORK)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to create homework");
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

        if (req.files.video) {
            const videoFile = req.files.video[0];
            postData.video = {
                url: videoFile.path,
                thumbnail: videoFile.thumbnail || "",
                duration: videoFile.duration || 0,
            };
        }

        if (req.files.attachments) {
            postData.attachments = req.files.attachments.map(file => ({
                fileName: file.originalname,
                fileUrl: file.path,
                fileType: file.mimetype,
                fileSize: file.size,
            }));
        }
    }

    // Create post
    const post = await Post.create(postData);

    // Populate user info
    await post.populate("user", "firstName lastName username profilePicture role");

    // Send notifications
    if (post.status === POST_STATUS.PUBLISHED) {
        await sendPostNotifications(post);
    }

    // Emit socket event
    if (post.status === POST_STATUS.PUBLISHED) {
        const io = getIO();

        if (targetClass) {
            io.to(`class-${targetClass}`).emit("new-post", post);
        }

        if (targetClasses && targetClasses.length > 0) {
            targetClasses.forEach(classId => {
                io.to(`class-${classId}`).emit("new-post", post);
            });
        }

        // Notify mentions
        if (mentions && mentions.length > 0) {
            mentions.forEach(userId => {
                io.to(userId.toString()).emit("new-mention", post);
            });
        }
    }

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
    if (req.user) {
        const visibilityQuery = buildVisibilityQuery(req.user);
        Object.assign(query, visibilityQuery);
    } else {
        query.visibility = VISIBILITY_TYPES.PUBLIC;
    }

    // Get posts
    const posts = await Post.find(query)
        .sort({ isPinned: -1, [sortBy]: order === "desc" ? -1 : 1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate("user", "firstName lastName username profilePicture role")
        .populate("targetClass", "name code")
        .populate("targetClasses", "name code")
        .lean({ virtuals: true });

    // Get total count
    const total = await Post.countDocuments(query);

    // Compute accurate commentsCount via aggregation
    const postIds = posts.map(p => p._id);
    let commentsCountMap = {};
    try {
        const counts = await Comment.aggregate([
            { $match: { post: { $in: postIds } } },
            { $group: { _id: "$post", count: { $sum: 1 } } },
        ]);
        commentsCountMap = counts.reduce((acc, cur) => { acc[cur._id.toString()] = cur.count; return acc; }, {});
    } catch { }

    // Add virtual fields
    const postsWithVirtuals = posts.map(post => ({
        ...post,
        likesCount: typeof post.likesCount === 'number' ? post.likesCount : (post.likes?.length || 0),
        commentsCount: (commentsCountMap[post._id.toString()] ?? (typeof post.commentsCount === 'number' ? post.commentsCount : (post.comments?.length || 0))),
        sharesCount: typeof post.sharesCount === 'number' ? post.sharesCount : (post.shares?.length || 0),
        isLiked: req.user ? (post.likes?.some?.(id => id.toString() === req.user._id.toString()) || false) : false,
    }));

    successResponse(res, HTTP_STATUS.OK, "Posts retrieved successfully", {
        posts: postsWithVirtuals,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get single post by ID
 * @route   GET /api/posts/:postId
 * @access  Private
 */
export const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId)
        .populate("user", "firstName lastName username profilePicture role bio")
        .populate("targetClass", "name code")
        .populate("targetClasses", "name code")
        .populate("mentions", "firstName lastName username profilePicture")
        .populate({
            path: "comments",
            populate: {
                path: "user",
                select: "firstName lastName username profilePicture role",
            },
        });

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    // Check permissions
    if (!req.user) {
        if (post.visibility !== VISIBILITY_TYPES.PUBLIC) {
            res.status(HTTP_STATUS.FORBIDDEN);
            throw new Error("You don't have permission to view this post");
        }
    } else if (!canViewPost(post, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view this post");
    }

    // Track view for authenticated users
    if (req.user?._id && typeof post.addView === 'function') {
        await post.addView(req.user._id);
    }

    // Mark announcement as read
    if (post.postType === POST_TYPES.ANNOUNCEMENT && req.user?._id) {
        await post.markAsRead(req.user._id);
    }

    // Convert to object and add virtual fields
    const postObject = post.toObject({ virtuals: true });
    postObject.isLiked = req.user?._id ? post.likes.some(id => id.toString() === req.user._id.toString()) : false;

    successResponse(res, HTTP_STATUS.OK, "Post retrieved successfully", { post: postObject });
});

/**
 * @desc    Update post
 * @route   PUT /api/posts/:postId
 * @access  Private
 */
export const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const updates = req.body;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    // Check ownership or permissions
    if (!canEditPost(post, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to edit this post");
    }

    // Save edit history if content changed
    if (updates.content && updates.content !== post.content) {
        post.editHistory.push({
            previousContent: post.content,
            editedBy: req.user._id,
        });
        post.isEdited = true;
    }

    // Update fields
    Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
            post[key] = updates[key];
        }
    });

    await post.save();

    await post.populate("user", "firstName lastName username profilePicture role");

    successResponse(res, HTTP_STATUS.OK, "Post updated successfully", { post });
});

/**
 * @desc    Delete post
 * @route   DELETE /api/posts/:postId
 * @access  Private
 */
export const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    // Check ownership or permissions
    if (!canDeletePost(post, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to delete this post");
    }

    // Soft delete
    post.isActive = false;
    post.status = POST_STATUS.DELETED;
    await post.save();

    successResponse(res, HTTP_STATUS.OK, "Post deleted successfully");
});

