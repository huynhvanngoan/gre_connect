import asyncHandler from "express-async-handler";
import { clerkClient } from "@clerk/clerk-sdk-node";
import User from "../models/user.model.js";
import { ROLES, PERMISSIONS } from "../utils/constants.js";
import { logger } from "../utils/logger.js";

/**
 * Require authentication - verify Clerk token
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401);
            throw new Error("Not authorized, no token provided");
        }

        const token = authHeader.split(" ")[1];

        // Verify token with Clerk
        const clerkUser = await clerkClient.verifyToken(token);

        if (!clerkUser) {
            res.status(401);
            throw new Error("Not authorized, invalid token");
        }

        // Get user from database using clerkId
        const user = await User.findOne({ clerkId: clerkUser.sub });

        if (!user) {
            res.status(404);
            throw new Error("User not found in database");
        }

        // Check if user is active
        if (!user.isActive) {
            res.status(403);
            throw new Error("Account is deactivated");
        }

        // Attach user to request
        req.user = user;
        req.clerkUser = clerkUser;

        next();
    } catch (error) {
        logger.error('[requireAuth] Authentication failed', {
            error: error.message,
            hasAuthHeader: !!req.headers.authorization,
            path: req.path,
            ip: req.ip,
        });
        res.status(401);
        throw new Error(`Authentication failed: ${error.message}`);
    }
});

/**
 * Optional authentication - doesn't throw error if no token
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const clerkUser = await clerkClient.verifyToken(token);

            if (clerkUser) {
                const user = await User.findOne({ clerkId: clerkUser.sub });
                if (user && user.isActive) {
                    req.user = user;
                    req.clerkUser = clerkUser;
                }
            }
        }
    } catch (error) {
        // Ignore errors for optional auth
        logger.debug("Optional auth failed", { error: error.message });
    }

    next();
});

/**
 * Require specific role(s)
 */
export const requireRole = (allowedRoles) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error("Not authorized");
        }

        // Convert single role to array
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        // Check if user has any of the allowed roles
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Access denied. Required role: ${roles.join(" or ")}`);
        }

        next();
    });
};

/**
 * Require specific permission(s)
 */
export const requirePermission = (requiredPermissions) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error("Not authorized");
        }

        // Convert single permission to array
        const permissions = Array.isArray(requiredPermissions)
            ? requiredPermissions
            : [requiredPermissions];

        // Check if user has all required permissions
        const hasAllPermissions = permissions.every(permission =>
            req.user.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
            res.status(403);
            throw new Error("You don't have permission to perform this action");
        }

        next();
    });
};

/**
 * Check if user is banned
 */
export const checkBanned = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    if (req.user.isBanned) {
        // Check if ban has expired
        if (req.user.bannedUntil && new Date() > req.user.bannedUntil) {
            // Unban user
            req.user.isBanned = false;
            req.user.banReason = undefined;
            req.user.bannedUntil = undefined;
            await req.user.save();
            return next();
        }

        res.status(403);
        throw new Error(
            `Your account is banned. Reason: ${req.user.banReason}${req.user.bannedUntil
                ? ` until ${req.user.bannedUntil.toLocaleDateString()}`
                : " permanently"
            }`
        );
    }

    next();
});

/**
 * Check if user is verified (for actions requiring verification)
 */
export const requireVerified = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.status(401);
        throw new Error("Not authorized");
    }

    if (!req.user.isVerified) {
        res.status(403);
        throw new Error("Your account must be verified to perform this action");
    }

    next();
});

/**
 * Check if user can access resource (owner or admin)
 */
export const checkResourceOwnership = (resourceField = "author") => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error("Not authorized");
        }

        // Staff and admins can access any resource
        if (req.user.role === ROLES.STAFF) {
            return next();
        }

        // Check if resource exists in request
        if (!req.resource) {
            res.status(500);
            throw new Error("Resource not loaded");
        }

        // Check ownership
        const ownerId = req.resource[resourceField];

        if (!ownerId) {
            res.status(500);
            throw new Error("Resource owner not found");
        }

        const isOwner = ownerId.toString() === req.user._id.toString();

        if (!isOwner) {
            res.status(403);
            throw new Error("You don't have permission to access this resource");
        }

        next();
    });
};

/**
 * Check if user can modify resource (owner, teacher for class, or admin)
 */
export const checkModifyPermission = () => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error("Not authorized");
        }

        // Staff can modify anything
        if (req.user.role === ROLES.STAFF) {
            return next();
        }

        // Resource owner can modify
        if (req.resource && req.resource.author) {
            const isOwner = req.resource.author.toString() === req.user._id.toString();
            if (isOwner) {
                return next();
            }
        }

        // Teachers can modify resources in their classes
        if (req.user.role === ROLES.TEACHER && req.resource && req.resource.targetClass) {
            const Class = require("../models/class.model.js").default;
            const classData = await Class.findById(req.resource.targetClass);

            if (classData) {
                const isMainTeacher = classData.mainTeacher.equals(req.user._id);
                const isAssistantTeacher = classData.assistantTeachers.some(
                    id => id.equals(req.user._id)
                );

                if (isMainTeacher || isAssistantTeacher) {
                    return next();
                }
            }
        }

        res.status(403);
        throw new Error("You don't have permission to modify this resource");
    });
};

/**
 * @deprecated Use Arcjet middleware from arcjet.middleware.js instead
 * This custom rate limiter has been removed to use Arcjet exclusively
 * which provides better scalability, Redis support, and advanced features
 */

/**
 * Middleware to record user login
 */
export const recordUserLogin = asyncHandler(async (req, res, next) => {
    if (req.user) {
        await req.user.recordLogin();
    }
    next();
});

/**
 * Check if user can message another user (based on privacy settings)
 */
export const checkMessagingPermission = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.status(401);
        throw new Error("Not authorized");
    }

    const { recipientId } = req.params;

    const recipient = await User.findById(recipientId);

    if (!recipient) {
        res.status(404);
        throw new Error("Recipient not found");
    }

    // Check recipient's privacy settings
    const allowMessages = recipient.privacySettings.allowMessages;

    if (allowMessages === "none") {
        res.status(403);
        throw new Error("This user doesn't accept messages");
    }

    if (allowMessages === "following") {
        const isFollowing = recipient.followers.some(
            id => id.toString() === req.user._id.toString()
        );

        if (!isFollowing) {
            res.status(403);
            throw new Error("You need to be followed by this user to send messages");
        }
    }

    req.recipient = recipient;
    next();
});