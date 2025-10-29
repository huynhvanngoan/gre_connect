import asyncHandler from "express-async-handler";
import { clerkClient } from "@clerk/clerk-sdk-node";
import User from "../models/user.model.js";
import { ROLES } from "../utils/constants.js";

/**
 * @desc    Sync user from Clerk to MongoDB
 * @route   POST /api/auth/sync
 * @access  Public (requires Clerk token in header)
 * 
 * This endpoint is called by the frontend after successful Clerk authentication
 * It creates or updates the user in MongoDB database
 */
export const syncUser = asyncHandler(async (req, res) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401);
            throw new Error("No token provided");
        }

        const token = authHeader.split(" ")[1];

        // Verify token with Clerk
        const clerkUser = await clerkClient.verifyToken(token);

        if (!clerkUser) {
            res.status(401);
            throw new Error("Invalid token");
        }

        // Get full user data from Clerk
        const clerkUserData = await clerkClient.users.getUser(clerkUser.sub);

        // Extract user data
        const email = clerkUserData.emailAddresses[0]?.emailAddress;
        const firstName = clerkUserData.firstName || "";
        const lastName = clerkUserData.lastName || "";
        const profilePicture = clerkUserData.imageUrl || "";

        // Generate username from email if not provided
        let username = clerkUserData.username;
        if (!username) {
            username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
            // Add random numbers if username might conflict
            username = username + Math.floor(Math.random() * 1000);
        }

        // Check if user exists in MongoDB
        let user = await User.findOne({ clerkId: clerkUser.sub });

        if (user) {
            // Update existing user
            user.email = email;
            user.firstName = firstName;
            user.lastName = lastName;
            user.profilePicture = profilePicture;
            user.isActive = true;

            // Record login
            await user.recordLogin();

            await user.save();

            res.status(200).json({
                success: true,
                message: "User synced successfully",
                data: {
                    user: {
                        _id: user._id,
                        clerkId: user.clerkId,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        username: user.username,
                        profilePicture: user.profilePicture,
                        role: user.role,
                        permissions: user.permissions,
                        isVerified: user.isVerified,
                        isBanned: user.isBanned,
                    },
                    isNewUser: false,
                },
            });
        } else {
            // Create new user
            // Get role from request body or default to student
            const role = req.body.role || ROLES.STUDENT;

            // Validate role
            if (!Object.values(ROLES).includes(role)) {
                res.status(400);
                throw new Error("Invalid role");
            }

            user = await User.create({
                clerkId: clerkUser.sub,
                email,
                firstName,
                lastName,
                username,
                profilePicture,
                role,
                isActive: true,
                loginCount: 1,
                lastLogin: new Date(),
            });

            res.status(201).json({
                success: true,
                message: "User created successfully",
                data: {
                    user: {
                        _id: user._id,
                        clerkId: user.clerkId,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        username: user.username,
                        profilePicture: user.profilePicture,
                        role: user.role,
                        permissions: user.permissions,
                        isVerified: user.isVerified,
                        isBanned: user.isBanned,
                    },
                    isNewUser: true,
                },
            });
        }
    } catch (error) {
        console.error("Sync user error:", error);
        res.status(401);
        throw new Error(`Authentication failed: ${error.message}`);
    }
});

/**
 * @desc    Check authentication status
 * @route   GET /api/auth/check
 * @access  Private
 */
export const checkAuth = asyncHandler(async (req, res) => {
    // User is attached by requireAuth middleware
    const user = req.user;

    res.status(200).json({
        success: true,
        message: "Authenticated",
        data: {
            user: {
                _id: user._id,
                clerkId: user.clerkId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                profilePicture: user.profilePicture,
                bannerImage: user.bannerImage,
                role: user.role,
                permissions: user.permissions,
                isVerified: user.isVerified,
                isBanned: user.isBanned,
                lastLogin: user.lastLogin,
            },
        },
    });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 * 
 * Note: Actual logout happens on Clerk side (frontend)
 * This endpoint is mainly for logging purposes
 */
export const logout = asyncHandler(async (req, res) => {
    // You can add any cleanup logic here
    // For example, invalidate refresh tokens, clear sessions, etc.

    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
});

/**
 * @desc    Refresh authentication token
 * @route   POST /api/auth/refresh
 * @access  Public
 * 
 * Note: Token refresh is handled by Clerk on frontend
 * This endpoint can be used for additional validation
 */
export const refreshToken = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        res.status(400);
        throw new Error("Token is required");
    }

    try {
        // Verify the refresh token with Clerk
        const session = await clerkClient.verifyToken(token);

        res.status(200).json({
            success: true,
            message: "Token is valid",
            data: {
                userId: session.sub,
            },
        });
    } catch (error) {
        res.status(401);
        throw new Error("Invalid or expired token");
    }
});

/**
 * @desc    Delete user account completely
 * @route   DELETE /api/auth/account
 * @access  Private
 */
export const deleteAccount = asyncHandler(async (req, res) => {
    const user = req.user;

    try {
        // Delete from Clerk
        await clerkClient.users.deleteUser(user.clerkId);

        // Delete from MongoDB (or soft delete)
        await User.findByIdAndDelete(user._id);

        // Or soft delete:
        // user.isActive = false;
        // user.deletedAt = new Date();
        // await user.save();

        res.status(200).json({
            success: true,
            message: "Account deleted successfully",
        });
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500);
        throw new Error("Failed to delete account");
    }
});

/**
 * Helper function to get user role from external source
 * You can customize this based on your needs
 */
const determineUserRole = (clerkUserData, requestBody) => {
    // Check if role is provided in request
    if (requestBody.role) {
        return requestBody.role;
    }

    // Check Clerk metadata
    if (clerkUserData.publicMetadata?.role) {
        return clerkUserData.publicMetadata.role;
    }

    // Check email domain (example: teachers might have specific email domain)
    const email = clerkUserData.emailAddresses[0]?.emailAddress;
    if (email.endsWith("@school.edu")) {
        return ROLES.TEACHER;
    }

    // Default to student
    return ROLES.STUDENT;
};

export default {
    syncUser,
    checkAuth,
    logout,
    refreshToken,
    deleteAccount,
};