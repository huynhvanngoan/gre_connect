import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

/**
 * @desc    Search users
 * @route   GET /api/users/search?q=query&role=student&limit=10
 * @access  Public
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const { q, role, limit = 20, page = 1 } = req.query;
    
    if (!q || q.trim().length === 0) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Search query is required");
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
    
    return createPaginatedResponse(
        res,
        HTTP_STATUS.OK,
        "Users found successfully",
        users,
        total,
        page,
        limit
    );
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
 * @desc    Get suggested users to follow
 * @route   GET /api/users/suggestions
 * @access  Private
 */
export const getSuggestedUsers = asyncHandler(async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Current user not found");
    }
    
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
    
    successResponse(res, HTTP_STATUS.OK, "Suggested users retrieved successfully", suggestions);
});

