import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Class from "../models/class.model.js";
import { uploadToCloudinary as uploadHelper } from "../utils/cloudinary.js";

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * @desc    Get current logged in user
 * @route   GET /api/users/me
 * @access  Private
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate("roleSpecificData.classId", "name code")
        .populate("roleSpecificData.classesTeaching", "name code")
        .select("-__v");
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    res.status(200).json({
        success: true,
        data: user,
    });
});

/**
 * @desc    Get user profile by username or ID
 * @route   GET /api/users/profile/:identifier
 * @access  Public (with privacy checks)
 */
export const getUserProfile = asyncHandler(async (req, res) => {
    const { identifier } = req.params;
    
    // Check if identifier is MongoDB ObjectId or username
    const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
    
    const user = isObjectId 
        ? await User.findById(identifier)
        : await User.findOne({ username: identifier });
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Check if user is active
    if (!user.isActive) {
        res.status(403);
        throw new Error("This account is not active");
    }
    
    // Privacy check
    const viewer = req.user; // May be undefined if not authenticated
    const canView = user.canViewProfile(viewer);
    
    if (!canView) {
        res.status(403);
        throw new Error("You don't have permission to view this profile");
    }
    
    // Select fields based on privacy settings
    let userData = user.toObject();
    
    if (!user.privacySettings.showEmail) {
        delete userData.email;
    }
    
    if (!user.privacySettings.showPhone) {
        delete userData.phone;
    }
    
    // Add relationship status if viewer is logged in
    if (viewer) {
        userData.isFollowing = user.followers.some(id => id.equals(viewer._id));
        userData.isFollowedBy = user.following.some(id => id.equals(viewer._id));
    }
    
    res.status(200).json({
        success: true,
        data: userData,
    });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Fields that can be updated
    const allowedUpdates = [
        "firstName",
        "lastName",
        "bio",
        "location",
        "phone",
    ];
    
    // Update only allowed fields
    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            user[field] = req.body[field];
        }
    });
    
    // Update role-specific data if provided
    if (req.body.roleSpecificData) {
        Object.keys(req.body.roleSpecificData).forEach(key => {
            if (req.body.roleSpecificData[key] !== undefined) {
                user.roleSpecificData[key] = req.body.roleSpecificData[key];
            }
        });
    }
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user,
    });
});

/**
 * @desc    Update profile picture
 * @route   PUT /api/users/me/profile-picture
 * @access  Private
 */
export const updateProfilePicture = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error("Please upload an image");
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Upload to Cloudinary (handled by middleware)
    user.profilePicture = req.file.path; // Cloudinary URL
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Profile picture updated successfully",
        data: {
            profilePicture: user.profilePicture,
        },
    });
});

/**
 * @desc    Update banner image
 * @route   PUT /api/users/me/banner
 * @access  Private
 */
export const updateBannerImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error("Please upload an image");
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    user.bannerImage = req.file.path;
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Banner image updated successfully",
        data: {
            bannerImage: user.bannerImage,
        },
    });
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/me
 * @access  Private
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Soft delete: deactivate account
    user.isActive = false;
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Account deactivated successfully",
    });
});

/**
 * @desc    Get user statistics
 * @route   GET /api/users/me/stats
 * @access  Private
 */
export const getUserStats = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Get post count
    const postCount = await Post.countDocuments({ author: user._id });
    
    // Get saved posts count
    const savedPostsCount = user.savedPosts.length;
    
    // Get class count based on role
    let classCount = 0;
    if (user.isStudent()) {
        classCount = user.roleSpecificData.classId ? 1 : 0;
    } else if (user.isTeacher()) {
        classCount = user.roleSpecificData.classesTeaching?.length || 0;
    }
    
    const stats = {
        posts: postCount,
        followers: user.followersCount,
        following: user.followingCount,
        savedPosts: savedPostsCount,
        classes: classCount,
        points: user.points,
        badges: user.badges.length,
        loginCount: user.loginCount,
        lastLogin: user.lastLogin,
        memberSince: user.createdAt,
    };
    
    res.status(200).json({
        success: true,
        data: stats,
    });
});


// ============================================
// USER DISCOVERY & SEARCH
// ============================================

/**
 * @desc    Search users
 * @route   GET /api/users/search?q=query&role=student&limit=10
 * @access  Public
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const { q, role, limit = 20, page = 1 } = req.query;
    
    if (!q || q.trim().length === 0) {
        res.status(400);
        throw new Error("Search query is required");
    }
    
    const searchRegex = new RegExp(q, "i");
    const query = {
        $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { username: searchRegex },
        ],
        isActive: true,
    };
    
    // Filter by role if provided
    if (role) {
        query.role = role;
    }
    
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
        .select("firstName lastName username profilePicture role bio")
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get users by role
 * @route   GET /api/users/by-role/:role
 * @access  Private
 */
export const getUsersByRole = asyncHandler(async (req, res) => {
    const { role } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const users = await User.findByRole(role)
        .select("firstName lastName username profilePicture bio")
        .limit(parseInt(limit))
        .skip(skip);
    
    const total = await User.countDocuments({ role, isActive: true });
    
    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get suggested users to follow
 * @route   GET /api/users/suggestions
 * @access  Private
 */
export const getSuggestedUsers = asyncHandler(async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    const { limit = 10 } = req.query;
    
    // Get users that current user is not following
    const suggestions = await User.find({
        _id: { 
            $ne: currentUser._id,
            $nin: currentUser.following 
        },
        isActive: true,
    })
    .select("firstName lastName username profilePicture bio role")
    .limit(parseInt(limit))
    .sort({ followersCount: -1, points: -1 }); // Popular users first
    
    res.status(200).json({
        success: true,
        data: suggestions,
    });
});

/**
 * @desc    Get all users (Admin/Staff only)
 * @route   GET /api/users/all
 * @access  Private (Teacher/Staff)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const { 
        role, 
        isActive, 
        limit = 50, 
        page = 1,
        sortBy = "createdAt",
        order = "desc"
    } = req.query;
    
    const query = {};
    
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";
    
    const skip = (page - 1) * limit;
    const sortOrder = order === "desc" ? -1 : 1;
    
    const users = await User.find(query)
        .select("-__v")
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ [sortBy]: sortOrder });
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
});


// ============================================
// RELATIONSHIPS (FOLLOW SYSTEM)
// ============================================

/**
 * @desc    Follow a user
 * @route   POST /api/users/:userId/follow
 * @access  Private
 */
export const followUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser) {
        res.status(404);
        throw new Error("Current user not found");
    }
    
    if (currentUser._id.toString() === userId) {
        res.status(400);
        throw new Error("You cannot follow yourself");
    }
    
    const userToFollow = await User.findById(userId);
    
    if (!userToFollow) {
        res.status(404);
        throw new Error("User not found");
    }
    
    if (!userToFollow.isActive) {
        res.status(400);
        throw new Error("Cannot follow inactive user");
    }
    
    // Check if already following
    if (currentUser.following.includes(userId)) {
        res.status(400);
        throw new Error("You are already following this user");
    }
    
    await currentUser.follow(userId);
    
    // Create notification for the followed user
    // TODO: Implement notification creation
    
    res.status(200).json({
        success: true,
        message: "User followed successfully",
    });
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/users/:userId/unfollow
 * @access  Private
 */
export const unfollowUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser) {
        res.status(404);
        throw new Error("Current user not found");
    }
    
    if (!currentUser.following.includes(userId)) {
        res.status(400);
        throw new Error("You are not following this user");
    }
    
    await currentUser.unfollow(userId);
    
    res.status(200).json({
        success: true,
        message: "User unfollowed successfully",
    });
});

/**
 * @desc    Get user's followers
 * @route   GET /api/users/:userId/followers
 * @access  Private
 */
export const getFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    const skip = (page - 1) * limit;
    
    const followers = await User.find({
        _id: { $in: user.followers }
    })
    .select("firstName lastName username profilePicture bio role")
    .limit(parseInt(limit))
    .skip(skip);
    
    res.status(200).json({
        success: true,
        data: followers,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: user.followers.length,
            pages: Math.ceil(user.followers.length / limit),
        },
    });
});

/**
 * @desc    Get users that a user is following
 * @route   GET /api/users/:userId/following
 * @access  Private
 */
export const getFollowing = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    const skip = (page - 1) * limit;
    
    const following = await User.find({
        _id: { $in: user.following }
    })
    .select("firstName lastName username profilePicture bio role")
    .limit(parseInt(limit))
    .skip(skip);
    
    res.status(200).json({
        success: true,
        data: following,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: user.following.length,
            pages: Math.ceil(user.following.length / limit),
        },
    });
});

/**
 * @desc    Check if current user follows another user
 * @route   GET /api/users/:userId/follow-status
 * @access  Private
 */
export const checkFollowStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    
    const isFollowing = currentUser.following.some(id => id.toString() === userId);
    const isFollower = currentUser.followers.some(id => id.toString() === userId);
    
    res.status(200).json({
        success: true,
        data: {
            isFollowing,
            isFollower,
        },
    });
});

/**
 * @desc    Remove a follower
 * @route   DELETE /api/users/:userId/remove-follower
 * @access  Private
 */
export const removeFollower = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser.followers.includes(userId)) {
        res.status(400);
        throw new Error("This user is not following you");
    }
    
    // Remove from current user's followers
    currentUser.followers = currentUser.followers.filter(
        id => id.toString() !== userId
    );
    await currentUser.save();
    
    // Remove current user from that user's following
    await User.findByIdAndUpdate(userId, {
        $pull: { following: currentUser._id }
    });
    
    res.status(200).json({
        success: true,
        message: "Follower removed successfully",
    });
});


// ============================================
// USER CONTENT
// ============================================

/**
 * @desc    Get user's posts
 * @route   GET /api/users/:userId/posts
 * @access  Private
 */
export const getUserPosts = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1, postType } = req.query;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
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
    const skip = (page - 1) * limit;
    
    const user = await User.findById(req.user._id)
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
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    res.status(200).json({
        success: true,
        data: user.savedPosts,
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
 * @route   POST /api/users/posts/:postId/save
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
    
    await user.savePost(postId);
    
    res.status(200).json({
        success: true,
        message: "Post saved successfully",
    });
});

/**
 * @desc    Unsave a post
 * @route   DELETE /api/users/posts/:postId/unsave
 * @access  Private
 */
export const unsavePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    await user.unsavePost(postId);
    
    res.status(200).json({
        success: true,
        message: "Post unsaved successfully",
    });
});


// ============================================
// SETTINGS
// ============================================

/**
 * @desc    Get notification settings
 * @route   GET /api/users/me/settings/notifications
 * @access  Private
 */
export const getNotificationSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    res.status(200).json({
        success: true,
        data: user.notificationSettings,
    });
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/users/me/settings/notifications
 * @access  Private
 */
export const updateNotificationSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Update only provided fields
    Object.keys(req.body).forEach(key => {
        if (user.notificationSettings[key] !== undefined) {
            user.notificationSettings[key] = req.body[key];
        }
    });
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Notification settings updated successfully",
        data: user.notificationSettings,
    });
});

/**
 * @desc    Get privacy settings
 * @route   GET /api/users/me/settings/privacy
 * @access  Private
 */
export const getPrivacySettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    res.status(200).json({
        success: true,
        data: user.privacySettings,
    });
});

/**
 * @desc    Update privacy settings
 * @route   PUT /api/users/me/settings/privacy
 * @access  Private
 */
export const updatePrivacySettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Update only provided fields
    Object.keys(req.body).forEach(key => {
        if (user.privacySettings[key] !== undefined) {
            user.privacySettings[key] = req.body[key];
        }
    });
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "Privacy settings updated successfully",
        data: user.privacySettings,
    });
});


// ============================================
// POINTS & GAMIFICATION
// ============================================

/**
 * @desc    Get user badges
 * @route   GET /api/users/me/badges
 * @access  Private
 */
export const getUserBadges = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    res.status(200).json({
        success: true,
        data: user.badges,
    });
});

/**
 * @desc    Get leaderboard
 * @route   GET /api/users/leaderboard
 * @access  Private
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
    const { limit = 10, timeframe = "all" } = req.query;
    
    let dateFilter = {};
    
    if (timeframe === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter.createdAt = { $gte: weekAgo };
    } else if (timeframe === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter.createdAt = { $gte: monthAgo };
    }
    
    const leaderboard = await User.find({
        isActive: true,
        ...dateFilter
    })
    .select("firstName lastName username profilePicture points badges role")
    .sort({ points: -1 })
    .limit(parseInt(limit));
    
    res.status(200).json({
        success: true,
        data: leaderboard,
    });
});


// ============================================
// CLASS RELATED
// ============================================

/**
 * @desc    Get user's classes
 * @route   GET /api/users/me/classes
 * @access  Private
 */
export const getUserClasses = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    let classes = [];
    
    if (user.isStudent()) {
        // Get student's class
        if (user.roleSpecificData.classId) {
            const classData = await Class.findById(user.roleSpecificData.classId)
                .populate("mainTeacher", "firstName lastName username profilePicture")
                .populate("assistantTeachers", "firstName lastName username profilePicture");
            
            if (classData) {
                classes = [classData];
            }
        }
    } else if (user.isTeacher()) {
        // Get teacher's classes
        classes = await Class.find({
            $or: [
                { mainTeacher: user._id },
                { assistantTeachers: user._id }
            ],
            status: "active"
        })
        .populate("mainTeacher", "firstName lastName username profilePicture")
        .populate("assistantTeachers", "firstName lastName username profilePicture");
    }
    
    res.status(200).json({
        success: true,
        data: classes,
    });
});

/**
 * @desc    Get classmates (for students) or students in classes (for teachers)
 * @route   GET /api/users/me/classmates
 * @access  Private
 */
export const getClassmates = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    let classmates = [];
    
    if (user.isStudent() && user.roleSpecificData.classId) {
        // Get other students in the same class
        classmates = await User.findStudentsByClass(user.roleSpecificData.classId);
        
        // Exclude current user
        classmates = classmates.filter(
            student => student._id.toString() !== user._id.toString()
        );
    } else if (user.isTeacher()) {
        // Get all students from teacher's classes
        const classes = await Class.find({
            $or: [
                { mainTeacher: user._id },
                { assistantTeachers: user._id }
            ],
            status: "active"
        });
        
        const studentIds = classes.flatMap(c => 
            c.students
                .filter(s => s.status === "active")
                .map(s => s.student)
        );
        
        // Remove duplicates
        const uniqueStudentIds = [...new Set(studentIds.map(id => id.toString()))];
        
        classmates = await User.find({
            _id: { $in: uniqueStudentIds }
        })
        .select("firstName lastName username profilePicture bio roleSpecificData.grade");
    }
    
    res.status(200).json({
        success: true,
        data: classmates,
    });
});


// ============================================
// ADMIN/STAFF FUNCTIONS
// ============================================

/**
 * @desc    Ban a user
 * @route   POST /api/users/:userId/ban
 * @access  Private (Staff only)
 */
export const banUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in days
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    if (user.isBanned) {
        res.status(400);
        throw new Error("User is already banned");
    }
    
    user.isBanned = true;
    user.banReason = reason;
    
    if (duration) {
        const bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + parseInt(duration));
        user.bannedUntil = bannedUntil;
    }
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "User banned successfully",
        data: {
            userId: user._id,
            banReason: user.banReason,
            bannedUntil: user.bannedUntil,
        },
    });
});

/**
 * @desc    Unban a user
 * @route   POST /api/users/:userId/unban
 * @access  Private (Staff only)
 */
export const unbanUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    if (!user.isBanned) {
        res.status(400);
        throw new Error("User is not banned");
    }
    
    user.isBanned = false;
    user.banReason = undefined;
    user.bannedUntil = undefined;
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "User unbanned successfully",
    });
});

/**
 * @desc    Verify a user
 * @route   POST /api/users/:userId/verify
 * @access  Private (Staff only)
 */
export const verifyUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    if (user.isVerified) {
        res.status(400);
        throw new Error("User is already verified");
    }
    
    user.isVerified = true;
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "User verified successfully",
    });
});

/**
 * @desc    Change user role
 * @route   PUT /api/users/:userId/role
 * @access  Private (Staff only)
 */
export const changeUserRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    const oldRole = user.role;
    user.role = role;
    
    // Clear role-specific data when changing roles
    user.roleSpecificData = {};
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "User role changed successfully",
        data: {
            userId: user._id,
            oldRole,
            newRole: user.role,
        },
    });
});