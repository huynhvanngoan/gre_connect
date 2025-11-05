import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";

/**
 * @desc    Search users
 * @route   GET /api/users/search?q=query&role=student&limit=10
 * @access  Public
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const { q, role, limit = 20, page = 1 } = req.query;
    
    if (!q || q.trim().length === 0) {
        res.status(400);
        throw new Error("Search query is required");
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
    
    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
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
    
    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get suggested users to follow
 * @route   GET /api/users/suggested
 * @access  Private
 */
export const getSuggestedUsers = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const currentUser = await User.findById(req.user._id);
    
    // Get users that current user is not following and not themselves
    const excludeIds = [currentUser._id, ...currentUser.following];
    
    const suggestedUsers = await User.find({
        _id: { $nin: excludeIds },
        isActive: true,
    })
    .select("firstName lastName username profilePicture bio role")
    .limit(parseInt(limit))
    .sort({ followersCount: -1, createdAt: -1 });
    
    res.status(200).json({
        success: true,
        data: suggestedUsers,
    });
});

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private (Admin)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    // Check if user is admin
    if (req.user.role !== "staff" && req.user.role !== "admin") {
        res.status(403);
        throw new Error("Only admins can access this endpoint");
    }
    
    const { limit = 50, page = 1, role, isActive } = req.query;
    
    const query = {};
    
    if (role) {
        query.role = role;
    }
    
    if (isActive !== undefined) {
        query.isActive = isActive === "true";
    }
    
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
        .select("-password")
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

