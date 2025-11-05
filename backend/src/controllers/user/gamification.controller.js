import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";

/**
 * @desc    Get user badges
 * @route   GET /api/users/me/badges
 * @access  Private
 */
export const getUserBadges = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    res.status(200).json({
        success: true,
        data: user.badges,
    });
});

/**
 * @desc    Get leaderboard
 * @route   GET /api/users/leaderboard
 * @access  Private
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
    const { limit = 10, timeframe = "all" } = req.query;
    
    let dateFilter = {};
    
    if (timeframe === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter.createdAt = { $gte: weekAgo };
    } else if (timeframe === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter.createdAt = { $gte: monthAgo };
    }
    
    const leaderboard = await User.find({
        isActive: true,
        ...dateFilter
    })
    .select("firstName lastName username profilePicture points badges role")
    .sort({ points: -1 })
    .limit(parseInt(limit));
    
    res.status(200).json({
        success: true,
        data: leaderboard,
    });
});

