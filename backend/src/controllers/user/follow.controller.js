import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";

/**
 * @desc    Follow a user
 * @route   POST /api/users/:userId/follow
 * @access  Private
 */
export const followUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser) {
        res.status(404);
        throw new Error("Current user not found");
    }
    
    if (currentUser._id.toString() === userId) {
        res.status(400);
        throw new Error("You cannot follow yourself");
    }
    
    const userToFollow = await User.findById(userId);
    
    if (!userToFollow) {
        res.status(404);
        throw new Error("User not found");
    }
    
    if (!userToFollow.isActive) {
        res.status(400);
        throw new Error("Cannot follow inactive user");
    }
    
    // Check if already following
    if (currentUser.following.includes(userId)) {
        res.status(400);
        throw new Error("You are already following this user");
    }
    
    await currentUser.follow(userId);
    
    // Create notification for the followed user
    // TODO: Implement notification creation
    
    res.status(200).json({
        success: true,
        message: "User followed successfully",
    });
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/users/:userId/unfollow
 * @access  Private
 */
export const unfollowUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser) {
        res.status(404);
        throw new Error("Current user not found");
    }
    
    if (!currentUser.following.includes(userId)) {
        res.status(400);
        throw new Error("You are not following this user");
    }
    
    await currentUser.unfollow(userId);
    
    res.status(200).json({
        success: true,
        message: "User unfollowed successfully",
    });
});

/**
 * @desc    Get user's followers
 * @route   GET /api/users/:userId/followers
 * @access  Private
 */
export const getFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    const skip = (page - 1) * limit;
    
    const followers = await User.find({
        _id: { $in: user.followers }
    })
    .select("firstName lastName username profilePicture bio role")
    .limit(parseInt(limit))
    .skip(skip);
    
    res.status(200).json({
        success: true,
        data: followers,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: user.followers.length,
            pages: Math.ceil(user.followers.length / limit),
        },
    });
});

/**
 * @desc    Get users that a user is following
 * @route   GET /api/users/:userId/following
 * @access  Private
 */
export const getFollowing = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    
    const skip = (page - 1) * limit;
    
    const following = await User.find({
        _id: { $in: user.following }
    })
    .select("firstName lastName username profilePicture bio role")
    .limit(parseInt(limit))
    .skip(skip);
    
    res.status(200).json({
        success: true,
        data: following,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: user.following.length,
            pages: Math.ceil(user.following.length / limit),
        },
    });
});

/**
 * @desc    Check if current user follows another user
 * @route   GET /api/users/:userId/follow-status
 * @access  Private
 */
export const checkFollowStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    
    const isFollowing = currentUser.following.some(id => id.toString() === userId);
    const isFollower = currentUser.followers.some(id => id.toString() === userId);
    
    res.status(200).json({
        success: true,
        data: {
            isFollowing,
            isFollower,
        },
    });
});

/**
 * @desc    Remove a follower
 * @route   DELETE /api/users/:userId/remove-follower
 * @access  Private
 */
export const removeFollower = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser.followers.includes(userId)) {
        res.status(400);
        throw new Error("This user is not following you");
    }
    
    // Remove from current user's followers
    currentUser.followers = currentUser.followers.filter(
        id => id.toString() !== userId
    );
    await currentUser.save();
    
    // Remove current user from that user's following
    await User.findByIdAndUpdate(userId, {
        $pull: { following: currentUser._id }
    });
    
    res.status(200).json({
        success: true,
        message: "Follower removed successfully",
    });
});

