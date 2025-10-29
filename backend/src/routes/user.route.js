import express from "express";
import {
    // Profile Management
    getUserProfile,
    getCurrentUser,
    updateUserProfile,
    updateProfilePicture,
    updateBannerImage,
    deleteUser,
    
    // User Discovery
    searchUsers,
    getUsersByRole,
    getSuggestedUsers,
    getUserStats,
    
    // Relationships
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    checkFollowStatus,
    removeFollower,
    
    // Posts & Content
    getUserPosts,
    getSavedPosts,
    savePost,
    unsavePost,
    
    // Settings
    updateNotificationSettings,
    updatePrivacySettings,
    getNotificationSettings,
    getPrivacySettings,
    
    // Points & Badges
    getUserBadges,
    getLeaderboard,
    
    // Admin/Staff functions
    banUser,
    unbanUser,
    verifyUser,
    changeUserRole,
    getAllUsers,
    
    // Class related (for students/teachers)
    getUserClasses,
    getClassmates,
    
} from "../controllers/user.controller.js";

import { 
    requireAuth, 
    requireRole, 
    checkBanned 
} from "../middlewares/auth.middleware.js";

import { 
    validateUserUpdate,
    validateRoleChange,
    validateBanUser,
} from "../validations/user.validation.js";

import { uploadToCloudinary } from "../middlewares/upload.middleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Search users (public)
router.get("/search", searchUsers);

// Get user profile by username/id (with privacy check)
router.get("/profile/:identifier", getUserProfile);


// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Apply authentication middleware to all routes below
router.use(requireAuth);
router.use(checkBanned);

// --------------------------------------------
// Current User Profile
// --------------------------------------------
router.get("/me", getCurrentUser);
router.put("/me", validateUserUpdate, updateUserProfile);
router.delete("/me", deleteUser);

// Profile Pictures
router.put("/me/profile-picture", uploadToCloudinary.single("image"), updateProfilePicture);
router.put("/me/banner", uploadToCloudinary.single("image"), updateBannerImage);

// User Stats
router.get("/me/stats", getUserStats);


// --------------------------------------------
// User Relationships (Follow System)
// --------------------------------------------
router.post("/:userId/follow", followUser);
router.delete("/:userId/unfollow", unfollowUser);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);
router.get("/:userId/follow-status", checkFollowStatus);
router.delete("/:userId/remove-follower", removeFollower);


// --------------------------------------------
// User Content
// --------------------------------------------
router.get("/:userId/posts", getUserPosts);
router.get("/me/saved-posts", getSavedPosts);
router.post("/posts/:postId/save", savePost);
router.delete("/posts/:postId/unsave", unsavePost);


// --------------------------------------------
// User Settings
// --------------------------------------------
router.get("/me/settings/notifications", getNotificationSettings);
router.put("/me/settings/notifications", updateNotificationSettings);
router.get("/me/settings/privacy", getPrivacySettings);
router.put("/me/settings/privacy", updatePrivacySettings);


// --------------------------------------------
// Points & Gamification
// --------------------------------------------
router.get("/me/badges", getUserBadges);
router.get("/leaderboard", getLeaderboard);


// --------------------------------------------
// Class Related (Students & Teachers)
// --------------------------------------------
router.get("/me/classes", getUserClasses);
router.get("/me/classmates", getClassmates);


// --------------------------------------------
// User Discovery
// --------------------------------------------
router.get("/suggestions", getSuggestedUsers);
router.get("/by-role/:role", getUsersByRole);


// ============================================
// TEACHER/STAFF ONLY ROUTES
// ============================================

// Get users by role (teachers/staff can see all)
router.get("/all", requireRole(["teacher", "staff"]), getAllUsers);


// ============================================
// STAFF ONLY ROUTES (Admin functions)
// ============================================

// User Management
router.post("/:userId/ban", requireRole(["staff"]), validateBanUser, banUser);
router.post("/:userId/unban", requireRole(["staff"]), unbanUser);
router.post("/:userId/verify", requireRole(["staff"]), verifyUser);
router.put("/:userId/role", requireRole(["staff"]), validateRoleChange, changeUserRole);


export default router;