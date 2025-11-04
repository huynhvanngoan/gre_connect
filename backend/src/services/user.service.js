import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import { logger } from "../utils/logger.js";

/**
 * Check if user can view another user's profile
 */
export const canViewProfile = (profileUser, viewer) => {
    if (!profileUser || !profileUser.isActive) {
        return false;
    }

    // Public profiles can be viewed by anyone
    if (profileUser.privacySettings.profileVisibility === "public") {
        return true;
    }

    // If no viewer (not authenticated), only public profiles are viewable
    if (!viewer) {
        return false;
    }

    // Users can always view their own profile
    if (profileUser._id.equals(viewer._id)) {
        return true;
    }

    // Staff can view any profile
    if (viewer.role === "staff" || viewer.role === "admin") {
        return true;
    }

    // Friends/followers visibility
    if (profileUser.privacySettings.profileVisibility === "followers") {
        return profileUser.followers.some(id => id.equals(viewer._id));
    }

    // Following visibility
    if (profileUser.privacySettings.profileVisibility === "following") {
        return profileUser.following.some(id => id.equals(viewer._id));
    }

    return false;
};

/**
 * Get user statistics
 */
export const getUserStatistics = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }

        const postCount = await Post.countDocuments({ author: userId });
        const savedPostsCount = user.savedPosts?.length || 0;

        let classCount = 0;
        if (user.isStudent()) {
            classCount = user.roleSpecificData?.classId ? 1 : 0;
        } else if (user.isTeacher()) {
            classCount = user.roleSpecificData?.classesTeaching?.length || 0;
        }

        return {
            posts: postCount,
            followers: user.followersCount || 0,
            following: user.followingCount || 0,
            savedPosts: savedPostsCount,
            classes: classCount,
            points: user.points || 0,
            badges: user.badges?.length || 0,
            loginCount: user.loginCount || 0,
            lastLogin: user.lastLogin,
            memberSince: user.createdAt,
        };
    } catch (error) {
        logger.error("Error getting user statistics", { error: error.message, userId });
        throw error;
    }
};

/**
 * Filter user data based on privacy settings
 */
export const filterUserDataByPrivacy = (user, viewer) => {
    const userData = user.toObject ? user.toObject() : { ...user };

    // Remove email if privacy setting doesn't allow
    if (!user.privacySettings?.showEmail) {
        delete userData.email;
    }

    // Remove phone if privacy setting doesn't allow
    if (!user.privacySettings?.showPhone) {
        delete userData.phone;
    }

    // Add relationship status if viewer is logged in
    if (viewer) {
        userData.isFollowing = user.followers?.some(id =>
            id.toString() === viewer._id.toString()
        ) || false;
        userData.isFollowedBy = user.following?.some(id =>
            id.toString() === viewer._id.toString()
        ) || false;
    }

    return userData;
};

/**
 * Validate follow action
 */
export const validateFollowAction = async (currentUserId, targetUserId) => {
    if (currentUserId.toString() === targetUserId.toString()) {
        throw new Error("You cannot follow yourself");
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
        throw new Error("Current user not found");
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        throw new Error("User not found");
    }

    if (!targetUser.isActive) {
        throw new Error("Cannot follow inactive user");
    }

    return { currentUser, targetUser };
};

