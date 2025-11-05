import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import { ROLES } from "../../utils/constants.js";

/**
 * @desc    Ban a user
 * @route   POST /api/users/:userId/ban
 * @access  Private (Admin, Staff)
 */
export const banUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in days
    
    // Check if user is admin or staff
    if (req.user.role !== ROLES.STAFF && req.user.role !== "admin") {
        res.status(403);
        throw new Error("Only admins and staff can ban users");
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Cannot ban yourself
    if (user._id.equals(req.user._id)) {
        res.status(400);
        throw new Error("You cannot ban yourself");
    }
    
    // Cannot ban other admins/staff
    if (user.role === ROLES.STAFF || user.role === "admin") {
        res.status(403);
        throw new Error("Cannot ban admin or staff members");
    }
    
    // Check if user has isBanned field or use isActive
    if (user.isBanned !== undefined) {
        user.isBanned = true;
        user.banReason = reason;
        if (duration) {
            const bannedUntil = new Date();
            bannedUntil.setDate(bannedUntil.getDate() + parseInt(duration));
            user.bannedUntil = bannedUntil;
        }
    } else {
        user.isActive = false;
        user.bannedAt = new Date();
        user.banReason = reason || "No reason provided";
    }
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "User banned successfully",
    });
});

/**
 * @desc    Unban a user
 * @route   POST /api/users/:userId/unban
 * @access  Private (Admin, Staff)
 */
export const unbanUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Check if user is admin or staff
    if (req.user.role !== ROLES.STAFF && req.user.role !== "admin") {
        res.status(403);
        throw new Error("Only admins and staff can unban users");
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Check if user has isBanned field or use isActive
    if (user.isBanned !== undefined) {
        user.isBanned = false;
        user.banReason = undefined;
        user.bannedUntil = undefined;
    } else {
        user.isActive = true;
        user.bannedAt = null;
        user.banReason = null;
    }
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "User unbanned successfully",
    });
});

/**
 * @desc    Verify a user
 * @route   POST /api/users/:userId/verify
 * @access  Private (Admin, Staff)
 */
export const verifyUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Check if user is admin or staff
    if (req.user.role !== ROLES.STAFF && req.user.role !== "admin") {
        res.status(403);
        throw new Error("Only admins and staff can verify users");
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
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
 * @access  Private (Admin only)
 */
export const changeUserRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Check if user is admin
    if (req.user.role !== "admin") {
        res.status(403);
        throw new Error("Only admins can change user roles");
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    // Validate role
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
        res.status(400);
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }
    
    // Cannot change your own role
    if (user._id.equals(req.user._id)) {
        res.status(400);
        throw new Error("You cannot change your own role");
    }
    
    user.role = role;
    
    // Clear role-specific data if changing role
    if (role !== user.role) {
        user.roleSpecificData = {};
    }
    
    await user.save();
    
    res.status(200).json({
        success: true,
        message: "User role updated successfully",
        data: user,
    });
});

