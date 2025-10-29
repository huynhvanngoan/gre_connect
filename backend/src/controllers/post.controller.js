import asyncHandler from "express-async-handler";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Class from "../models/class.model.js";
import { Notification } from "../models/notification.model.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { HTTP_STATUS, POST_TYPES, POST_STATUS, VISIBILITY_TYPES, PERMISSIONS, NOTIFICATION_TYPES } from "../utils/constants.js";
import { getIO } from "../config/socket.js";

// ============================================
// CREATE POST
// ============================================

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

// ============================================
// GET ALL POSTS (FEED)
// ============================================

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
    const visibilityQuery = buildVisibilityQuery(req.user);
    Object.assign(query, visibilityQuery);

    // Get posts
    const posts = await Post.find(query)
        .sort({ isPinned: -1, [sortBy]: order === "desc" ? -1 : 1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate("user", "firstName lastName username profilePicture role")
        .populate("targetClass", "name code")
        .populate("targetClasses", "name code")
        .populate({
            path: "comments",
            options: { limit: 3, sort: { createdAt: -1 } },
            populate: {
                path: "user",
                select: "firstName lastName username profilePicture",
            },
        })
        .lean();

    // Get total count
    const total = await Post.countDocuments(query);

    // Add virtual fields
    const postsWithVirtuals = posts.map(post => ({
        ...post,
        likesCount: post.likes?.length || 0,
        commentsCount: post.comments?.length || 0,
        sharesCount: post.shares?.length || 0,
        isLiked: post.likes?.some(id => id.toString() === req.user._id.toString()) || false,
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

// ============================================
// GET POST BY ID
// ============================================

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

    // Check if user can view this post
    if (!canViewPost(post, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view this post");
    }

    // Track view
    await post.trackView(req.user._id);

    // Mark announcement as read
    if (post.postType === POST_TYPES.ANNOUNCEMENT) {
        await post.markAsRead(req.user._id);
    }

    // Convert to object and add virtual fields
    const postObject = post.toObject({ virtuals: true });
    postObject.isLiked = post.likes.some(id => id.toString() === req.user._id.toString());

    successResponse(res, HTTP_STATUS.OK, "Post retrieved successfully", { post: postObject });
});

// ============================================
// UPDATE POST
// ============================================

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

// ============================================
// DELETE POST
// ============================================

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

    // Soft delete or hard delete
    post.isActive = false;
    post.status = POST_STATUS.DELETED;
    await post.save();

    // Or hard delete:
    // await post.deleteOne();

    successResponse(res, HTTP_STATUS.OK, "Post deleted successfully");
});

// ============================================
// LIKE/UNLIKE POST
// ============================================

/**
 * @desc    Like or unlike a post
 * @route   POST /api/posts/:postId/like
 * @access  Private
 */
export const toggleLikePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
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
        await Notification.createNotification({
            recipientId: post.user,
            senderId: userId,
            type: NOTIFICATION_TYPES.POST_LIKE,
            title: "New Like",
            message: `${req.user.fullName} liked your post`,
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
    }

    successResponse(res, HTTP_STATUS.OK, liked ? "Post liked" : "Post unliked", {
        liked,
        likesCount: post.likesCount,
    });
});

// ============================================
// SHARE POST
// ============================================

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

// ============================================
// PIN/UNPIN POST
// ============================================

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

// ============================================
// REPORT POST
// ============================================

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

// ============================================
// HOMEWORK SPECIFIC ENDPOINTS
// ============================================

/**
 * @desc    Submit homework
 * @route   POST /api/posts/:postId/submit
 * @access  Private (Students)
 */
export const submitHomework = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content, files } = req.body;
    const studentId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.HOMEWORK) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a homework post");
    }

    // Handle uploaded files from middleware
    let submissionFiles = files || [];
    if (req.files && req.files.attachments) {
        submissionFiles = req.files.attachments.map(file => ({
            fileName: file.originalname,
            fileUrl: file.path,
        }));
    }

    const submissionData = {
        content,
        files: submissionFiles,
    };

    await post.submitHomework(studentId, submissionData);

    // Notify teacher
    await Notification.createNotification({
        recipientId: post.user,
        senderId: studentId,
        type: NOTIFICATION_TYPES.HOMEWORK_SUBMITTED,
        title: "Homework Submitted",
        message: `${req.user.fullName} submitted homework: ${post.content.substring(0, 50)}...`,
        actionUrl: `/posts/${postId}`,
        postId: postId,
    });

    successResponse(res, HTTP_STATUS.OK, "Homework submitted successfully");
});

/**
 * @desc    Grade homework submission
 * @route   POST /api/posts/:postId/grade/:studentId
 * @access  Private (Teachers)
 */
export const gradeHomework = asyncHandler(async (req, res) => {
    const { postId, studentId } = req.params;
    const { score, feedback } = req.body;
    const graderId = req.user._id;

    if (!req.user.hasPermission(PERMISSIONS.GRADE_HOMEWORK)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to grade homework");
    }

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.HOMEWORK) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a homework post");
    }

    await post.gradeSubmission(studentId, score, feedback, graderId);

    // Notify student
    await Notification.createNotification({
        recipientId: studentId,
        senderId: graderId,
        type: NOTIFICATION_TYPES.HOMEWORK_GRADED,
        title: "Homework Graded",
        message: `Your homework has been graded: ${score}/${post.homeworkData.maxScore}`,
        actionUrl: `/posts/${postId}`,
        postId: postId,
    });

    successResponse(res, HTTP_STATUS.OK, "Homework graded successfully");
});

/**
 * @desc    Get homework submissions
 * @route   GET /api/posts/:postId/submissions
 * @access  Private (Teachers)
 */
export const getHomeworkSubmissions = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId)
        .populate("homeworkData.submissions.student", "firstName lastName username profilePicture studentId")
        .populate("homeworkData.submissions.gradedBy", "firstName lastName username");

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.HOMEWORK) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a homework post");
    }

    // Check permission
    if (!canViewHomeworkSubmissions(post, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view submissions");
    }

    successResponse(res, HTTP_STATUS.OK, "Submissions retrieved successfully", {
        submissions: post.homeworkData.submissions,
    });
});

// ============================================
// ANNOUNCEMENT SPECIFIC ENDPOINTS
// ============================================

/**
 * @desc    Acknowledge announcement
 * @route   POST /api/posts/:postId/acknowledge
 * @access  Private
 */
export const acknowledgeAnnouncement = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.ANNOUNCEMENT) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not an announcement");
    }

    await post.acknowledge(userId);

    successResponse(res, HTTP_STATUS.OK, "Announcement acknowledged successfully");
});

// ============================================
// POLL SPECIFIC ENDPOINTS
// ============================================

/**
 * @desc    Vote on poll
 * @route   POST /api/posts/:postId/vote
 * @access  Private
 */
export const votePoll = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.POLL) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a poll");
    }

    await post.votePoll(userId, optionIndex);

    // Calculate results
    const results = post.pollData.options.map((option, index) => ({
        index,
        text: option.text,
        votes: option.votes.length,
        percentage: post.pollData.options.reduce((total, opt) => total + opt.votes.length, 0) > 0
            ? ((option.votes.length / post.pollData.options.reduce((total, opt) => total + opt.votes.length, 0)) * 100).toFixed(2)
            : 0,
    }));

    successResponse(res, HTTP_STATUS.OK, "Vote recorded successfully", { results });
});

/**
 * @desc    Get poll results
 * @route   GET /api/posts/:postId/poll-results
 * @access  Private
 */
export const getPollResults = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.POLL) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a poll");
    }

    const totalVotes = post.pollData.options.reduce((total, opt) => total + opt.votes.length, 0);

    const results = post.pollData.options.map((option, index) => ({
        index,
        text: option.text,
        votes: option.votes.length,
        percentage: totalVotes > 0 ? ((option.votes.length / totalVotes) * 100).toFixed(2) : 0,
        hasVoted: option.votes.some(id => id.toString() === req.user._id.toString()),
    }));

    successResponse(res, HTTP_STATUS.OK, "Poll results retrieved successfully", {
        question: post.pollData.question,
        totalVotes,
        results,
        isExpired: post.isExpired,
    });
});

// ============================================
// EVENT SPECIFIC ENDPOINTS
// ============================================

/**
 * @desc    RSVP to event
 * @route   POST /api/posts/:postId/rsvp
 * @access  Private
 */
export const rsvpEvent = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.EVENT) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not an event");
    }

    await post.respondToEvent(userId, status);

    // Notify event creator
    if (!post.user.equals(userId)) {
        await Notification.createNotification({
            recipientId: post.user,
            senderId: userId,
            type: NOTIFICATION_TYPES.EVENT_INVITATION,
            title: "Event RSVP",
            message: `${req.user.fullName} is ${status} for your event`,
            actionUrl: `/posts/${postId}`,
            postId: postId,
        });
    }

    successResponse(res, HTTP_STATUS.OK, "RSVP recorded successfully");
});

/**
 * @desc    Get event attendees
 * @route   GET /api/posts/:postId/attendees
 * @access  Private
 */
export const getEventAttendees = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId)
        .populate("eventData.attendees.user", "firstName lastName username profilePicture role");

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.EVENT) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not an event");
    }

    const attendees = {
        going: post.eventData.attendees.filter(a => a.status === "going"),
        maybe: post.eventData.attendees.filter(a => a.status === "maybe"),
        notGoing: post.eventData.attendees.filter(a => a.status === "not_going"),
    };

    successResponse(res, HTTP_STATUS.OK, "Attendees retrieved successfully", { attendees });
});

// ============================================
// SEARCH & FILTER
// ============================================

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

    const posts = await Post.searchPosts(q, req.user)
        .limit(parseInt(limit))
        .skip(skip)
        .populate("user", "firstName lastName username profilePicture role");

    const total = await Post.countDocuments({
        $or: [
            { content: new RegExp(q, "i") },
            { tags: new RegExp(q, "i") },
        ],
        status: POST_STATUS.PUBLISHED,
        isActive: true,
    });

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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build visibility query based on user role
 */
function buildVisibilityQuery(user) {
    const query = {};

    if (user.role === "student") {
        query.$or = [
            { visibility: VISIBILITY_TYPES.PUBLIC },
            { visibility: VISIBILITY_TYPES.STUDENTS_ONLY },
            {
                visibility: VISIBILITY_TYPES.CLASS_SPECIFIC,
                $or: [
                    { targetClass: user.roleSpecificData?.classId },
                    { targetClasses: user.roleSpecificData?.classId },
                ],
            },
            {
                visibility: VISIBILITY_TYPES.FOLLOWERS_ONLY,
                user: { $in: user.following },
            },
            { user: user._id },
        ];
    } else if (user.role === "teacher") {
        query.$or = [
            { visibility: VISIBILITY_TYPES.PUBLIC },
            { visibility: VISIBILITY_TYPES.TEACHERS_ONLY },
            {
                visibility: VISIBILITY_TYPES.CLASS_SPECIFIC,
                $or: [
                    { targetClass: { $in: user.roleSpecificData?.classesTeaching || [] } },
                    { targetClasses: { $in: user.roleSpecificData?.classesTeaching || [] } },
                ],
            },
            {
                visibility: VISIBILITY_TYPES.FOLLOWERS_ONLY,
                user: { $in: user.following },
            },
            { user: user._id },
        ];
    }
    // Staff can see everything

    return query;
}

/**
 * Check if user can view post
 */
function canViewPost(post, user) {
    // Staff can view everything
    if (user.role === "staff") return true;

    // Owner can view own posts
    if (post.user.equals(user._id)) return true;

    // Check visibility
    if (post.visibility === VISIBILITY_TYPES.PUBLIC) return true;

    if (post.visibility === VISIBILITY_TYPES.STUDENTS_ONLY && user.role === "student") return true;

    if (post.visibility === VISIBILITY_TYPES.TEACHERS_ONLY && user.role === "teacher") return true;

    if (post.visibility === VISIBILITY_TYPES.CLASS_SPECIFIC) {
        if (user.role === "student" && post.targetClass?.equals(user.roleSpecificData?.classId)) return true;
        if (user.role === "student" && post.targetClasses?.some(id => id.equals(user.roleSpecificData?.classId))) return true;
        if (user.role === "teacher" && user.roleSpecificData?.classesTeaching?.some(id => post.targetClass?.equals(id) || post.targetClasses?.some(cId => cId.equals(id)))) return true;
    }

    if (post.visibility === VISIBILITY_TYPES.FOLLOWERS_ONLY) {
        return user.following.some(id => id.equals(post.user));
    }

    return false;
}

/**
 * Check if user can edit post
 */
function canEditPost(post, user) {
    // Owner can edit
    if (post.user.equals(user._id)) return true;

    // Staff can edit
    if (user.role === "staff") return true;

    // Teacher can edit class posts
    if (user.role === "teacher" && post.targetClass && user.roleSpecificData?.classesTeaching?.some(id => id.equals(post.targetClass))) {
        return true;
    }

    return false;
}

/**
 * Check if user can delete post
 */
function canDeletePost(post, user) {
    // Owner can delete
    if (post.user.equals(user._id)) return true;

    // Staff can delete
    if (user.role === "staff") return true;

    return false;
}

/**
 * Check if user can view homework submissions
 */
function canViewHomeworkSubmissions(post, user) {
    // Post owner can view
    if (post.user.equals(user._id)) return true;

    // Staff can view
    if (user.role === "staff") return true;

    // Teachers of the class can view
    if (user.role === "teacher" && post.targetClass && user.roleSpecificData?.classesTeaching?.some(id => id.equals(post.targetClass))) {
        return true;
    }

    return false;
}

/**
 * Send notifications for new post
 */
async function sendPostNotifications(post) {
    try {
        let recipients = [];

        // Get recipients based on post type and target
        if (post.targetClass) {
            const classData = await Class.findById(post.targetClass).populate("students.student");
            recipients = classData.students.filter(s => s.status === "active").map(s => s.student._id);
        } else if (post.targetClasses && post.targetClasses.length > 0) {
            for (const classId of post.targetClasses) {
                const classData = await Class.findById(classId).populate("students.student");
                const classStudents = classData.students.filter(s => s.status === "active").map(s => s.student._id);
                recipients.push(...classStudents);
            }
        }

        // Remove duplicates
        recipients = [...new Set(recipients.map(id => id.toString()))];

        // Determine notification type and message
        let notificationType;
        let title;
        let message;

        switch (post.postType) {
            case POST_TYPES.HOMEWORK:
                notificationType = NOTIFICATION_TYPES.NEW_HOMEWORK;
                title = "New Homework";
                message = `New homework assigned: ${post.content.substring(0, 50)}...`;
                break;
            case POST_TYPES.ANNOUNCEMENT:
                notificationType = NOTIFICATION_TYPES.NEW_ANNOUNCEMENT;
                title = "New Announcement";
                message = post.content.substring(0, 100);
                break;
            case POST_TYPES.EVENT:
                notificationType = NOTIFICATION_TYPES.EVENT_INVITATION;
                title = "New Event";
                message = `${post.eventData.title}`;
                break;
            default:
                notificationType = NOTIFICATION_TYPES.NEW_POST;
                title = "New Post";
                message = post.content.substring(0, 100);
        }

        // Create notifications
        for (const recipientId of recipients) {
            await Notification.createNotification({
                recipientId,
                senderId: post.user,
                type: notificationType,
                title,
                message,
                actionUrl: `/posts/${post._id}`,
                postId: post._id,
            });
        }
    } catch (error) {
        console.error("Error sending post notifications:", error);
    }
}

export default {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    toggleLikePost,
    sharePost,
    togglePinPost,
    reportPost,
    submitHomework,
    gradeHomework,
    getHomeworkSubmissions,
    acknowledgeAnnouncement,
    votePoll,
    getPollResults,
    rsvpEvent,
    getEventAttendees,
    searchPosts,
    getTrendingPosts,
    getPostsByClass,
    getPostAnalytics,
};