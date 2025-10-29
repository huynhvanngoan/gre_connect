import { body, param, query } from "express-validator";
import { ROLES } from "../utils/constants.js";

// ============================================
// USER UPDATE VALIDATION
// ============================================

export const validateUserUpdate = [
    body("firstName")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("First name must be between 2 and 50 characters"),
    
    body("lastName")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Last name must be between 2 and 50 characters"),
    
    body("bio")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Bio must not exceed 500 characters"),
    
    body("location")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Location must not exceed 100 characters"),
    
    body("phone")
        .optional()
        .trim()
        .matches(/^[0-9+\-\s()]+$/)
        .withMessage("Phone number format is invalid"),
    
    body("roleSpecificData")
        .optional()
        .isObject()
        .withMessage("Role specific data must be an object"),
    
    body("roleSpecificData.grade")
        .optional()
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("Grade must be between 1 and 20 characters"),
    
    body("roleSpecificData.department")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Department must be between 2 and 100 characters"),
    
    body("roleSpecificData.subjects")
        .optional()
        .isArray()
        .withMessage("Subjects must be an array"),
    
    body("roleSpecificData.parentContact.name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Parent contact name must be between 2 and 100 characters"),
    
    body("roleSpecificData.parentContact.phone")
        .optional()
        .trim()
        .matches(/^[0-9+\-\s()]+$/)
        .withMessage("Parent contact phone format is invalid"),
    
    body("roleSpecificData.parentContact.email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Parent contact email is invalid"),
];

// ============================================
// NOTIFICATION SETTINGS VALIDATION
// ============================================

export const validateNotificationSettings = [
    body("email")
        .optional()
        .isBoolean()
        .withMessage("Email notification setting must be a boolean"),
    
    body("push")
        .optional()
        .isBoolean()
        .withMessage("Push notification setting must be a boolean"),
    
    body("announcements")
        .optional()
        .isBoolean()
        .withMessage("Announcements notification setting must be a boolean"),
    
    body("homework")
        .optional()
        .isBoolean()
        .withMessage("Homework notification setting must be a boolean"),
    
    body("comments")
        .optional()
        .isBoolean()
        .withMessage("Comments notification setting must be a boolean"),
    
    body("likes")
        .optional()
        .isBoolean()
        .withMessage("Likes notification setting must be a boolean"),
];

// ============================================
// PRIVACY SETTINGS VALIDATION
// ============================================

export const validatePrivacySettings = [
    body("profileVisibility")
        .optional()
        .isIn(["public", "friends", "private"])
        .withMessage("Profile visibility must be public, friends, or private"),
    
    body("showEmail")
        .optional()
        .isBoolean()
        .withMessage("Show email setting must be a boolean"),
    
    body("showPhone")
        .optional()
        .isBoolean()
        .withMessage("Show phone setting must be a boolean"),
    
    body("allowMessages")
        .optional()
        .isIn(["everyone", "following", "none"])
        .withMessage("Allow messages must be everyone, following, or none"),
];

// ============================================
// SEARCH VALIDATION
// ============================================

export const validateSearch = [
    query("q")
        .trim()
        .notEmpty()
        .withMessage("Search query is required")
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
    
    query("role")
        .optional()
        .isIn(Object.values(ROLES))
        .withMessage(`Role must be one of: ${Object.values(ROLES).join(", ")}`),
    
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1"),
];

// ============================================
// ROLE CHANGE VALIDATION (Admin only)
// ============================================

export const validateRoleChange = [
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
    
    body("role")
        .notEmpty()
        .withMessage("Role is required")
        .isIn(Object.values(ROLES))
        .withMessage(`Role must be one of: ${Object.values(ROLES).join(", ")}`),
];

// ============================================
// BAN USER VALIDATION
// ============================================

export const validateBanUser = [
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
    
    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Ban reason is required")
        .isLength({ min: 10, max: 500 })
        .withMessage("Ban reason must be between 10 and 500 characters"),
    
    body("duration")
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage("Ban duration must be between 1 and 365 days"),
];

// ============================================
// USER ID PARAM VALIDATION
// ============================================

export const validateUserId = [
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
];

// ============================================
// POST ID PARAM VALIDATION
// ============================================

export const validatePostId = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
];

// ============================================
// PAGINATION VALIDATION
// ============================================

export const validatePagination = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1"),
    
    query("sortBy")
        .optional()
        .isIn(["createdAt", "updatedAt", "firstName", "lastName", "points", "followersCount"])
        .withMessage("Invalid sort field"),
    
    query("order")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Order must be asc or desc"),
];

// ============================================
// LEADERBOARD VALIDATION
// ============================================

export const validateLeaderboard = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("timeframe")
        .optional()
        .isIn(["all", "week", "month"])
        .withMessage("Timeframe must be all, week, or month"),
];