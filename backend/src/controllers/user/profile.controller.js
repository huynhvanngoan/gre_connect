import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import Post from "../../models/post.model.js";

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

