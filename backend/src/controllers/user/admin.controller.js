import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

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
    
    return createPaginatedResponse(
        res,
        HTTP_STATUS.OK,
        "Users retrieved successfully",
        users,
        total,
        page,
        limit
    );
});

/**
 * @desc    Ban a user
 * @route   POST /api/users/:userId/ban
 * @access  Private (Staff only)
 */
export const banUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in days
    
    const user = await findOr404(User, userId, "User not found");
    
    if (user.isBanned) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "User is already banned");
    }
    
    user.isBanned = true;
    user.banReason = reason;
    
    if (duration) {
        const bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + parseInt(duration));
        user.bannedUntil = bannedUntil;
    }
    
    await user.save();
    
    successResponse(res, HTTP_STATUS.OK, "User banned successfully", {
        userId: user._id,
        banReason: user.banReason,
        bannedUntil: user.bannedUntil,
    });
});

/**
 * @desc    Unban a user
 * @route   POST /api/users/:userId/unban
 * @access  Private (Staff only)
 */
export const unbanUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await findOr404(User, userId, "User not found");
    
    if (!user.isBanned) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "User is not banned");
    }
    
    user.isBanned = false;
    user.banReason = undefined;
    user.bannedUntil = undefined;
    
    await user.save();
    
    successResponse(res, HTTP_STATUS.OK, "User unbanned successfully", null);
});

/**
 * @desc    Verify a user
 * @route   POST /api/users/:userId/verify
 * @access  Private (Staff only)
 */
export const verifyUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await findOr404(User, userId, "User not found");
    
    if (user.isVerified) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "User is already verified");
    }
    
    user.isVerified = true;
    await user.save();
    
    successResponse(res, HTTP_STATUS.OK, "User verified successfully", null);
});

/**
 * @desc    Change user role
 * @route   PUT /api/users/:userId/role
 * @access  Private (Staff only)
 */
export const changeUserRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    
    const user = await findOr404(User, userId, "User not found");
    
    const oldRole = user.role;
    user.role = role;
    
    // Clear role-specific data when changing roles
    user.roleSpecificData = {};
    
    await user.save();
    
    successResponse(res, HTTP_STATUS.OK, "User role changed successfully", {
        userId: user._id,
        oldRole,
        newRole: user.role,
    });
});

