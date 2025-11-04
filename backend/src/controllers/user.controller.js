// ============================================
// RE-EXPORT FROM SUB-CONTROLLERS
// ============================================

// Profile Management
export {
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    updateProfilePicture,
    updateBannerImage,
    deleteUser,
    getUserStats,
} from "./user/profile.controller.js";

// Follow System
export {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    checkFollowStatus,
    removeFollower,
} from "./user/follow.controller.js";

// Content Management
export {
    getUserPosts,
    getSavedPosts,
    savePost,
    unsavePost,
} from "./user/content.controller.js";

// Settings
export {
    getNotificationSettings,
    updateNotificationSettings,
    getPrivacySettings,
    updatePrivacySettings,
} from "./user/settings.controller.js";

// Social & Gamification
export {
    getUserBadges,
    getLeaderboard,
    getUserClasses,
    getClassmates,
} from "./user/social.controller.js";

// Admin Functions
export {
    banUser,
    unbanUser,
    verifyUser,
    changeUserRole,
    getAllUsers,
} from "./user/admin.controller.js";

// Search & Discovery
export {
    searchUsers,
    getUsersByRole,
    getSuggestedUsers,
} from "./user/search.controller.js";

// Default export for backward compatibility
export default {
    // Profile
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    updateProfilePicture,
    updateBannerImage,
    deleteUser,
    getUserStats,
    
    // Follow
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    checkFollowStatus,
    removeFollower,
    
    // Content
    getUserPosts,
    getSavedPosts,
    savePost,
    unsavePost,
    
    // Settings
    getNotificationSettings,
    updateNotificationSettings,
    getPrivacySettings,
    updatePrivacySettings,
    
    // Social
    getUserBadges,
    getLeaderboard,
    getUserClasses,
    getClassmates,
    
    // Admin
    banUser,
    unbanUser,
    verifyUser,
    changeUserRole,
    getAllUsers,
    
    // Search
    searchUsers,
    getUsersByRole,
    getSuggestedUsers,
};
