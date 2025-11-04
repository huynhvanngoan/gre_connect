import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { validateFollowAction } from "../../services/user.service.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

/**
 * @desc    Follow a user
 * @route   POST /api/users/:userId/follow
 * @access  Private
 */
export const followUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const { currentUser, targetUser } = await validateFollowAction(req.user._id, userId);

    // Check if already following
    if (currentUser.following.includes(userId)) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "You are already following this user");
    }

    await currentUser.follow(userId);

    // TODO: Create notification for the followed user

    successResponse(res, HTTP_STATUS.OK, "User followed successfully", null);
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/users/:userId/unfollow
 * @access  Private
 */
export const unfollowUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await findOr404(User, req.user._id, "Current user not found");

    if (!currentUser.following.includes(userId)) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "You are not following this user");
    }

    await currentUser.unfollow(userId);

    successResponse(res, HTTP_STATUS.OK, "User unfollowed successfully", null);
});

/**
 * @desc    Get user's followers
 * @route   GET /api/users/:userId/followers
 * @access  Private
 */
export const getFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const user = await findOr404(User, userId, "User not found");

    const skip = (page - 1) * limit;

    const followers = await User.find({
        _id: { $in: user.followers }
    })
        .select("firstName lastName username profilePicture bio role")
        .limit(parseInt(limit))
        .skip(skip);

    return createPaginatedResponse(
        res,
        HTTP_STATUS.OK,
        "Followers retrieved successfully",
        followers,
        user.followers.length,
        page,
        limit
    );
});

/**
 * @desc    Get users that a user is following
 * @route   GET /api/users/:userId/following
 * @access  Private
 */
export const getFollowing = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const user = await findOr404(User, userId, "User not found");

    const skip = (page - 1) * limit;

    const following = await User.find({
        _id: { $in: user.following }
    })
        .select("firstName lastName username profilePicture bio role")
        .limit(parseInt(limit))
        .skip(skip);

    return createPaginatedResponse(
        res,
        HTTP_STATUS.OK,
        "Following retrieved successfully",
        following,
        user.following.length,
        page,
        limit
    );
});

/**
 * @desc    Check if current user follows another user
 * @route   GET /api/users/:userId/follow-status
 * @access  Private
 */
export const checkFollowStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await findOr404(User, req.user._id, "Current user not found");

    const isFollowing = currentUser.following.some(id => id.toString() === userId);
    const isFollower = currentUser.followers.some(id => id.toString() === userId);

    successResponse(res, HTTP_STATUS.OK, "Follow status retrieved successfully", {
        isFollowing,
        isFollower,
    });
});

/**
 * @desc    Remove a follower
 * @route   DELETE /api/users/:userId/remove-follower
 * @access  Private
 */
export const removeFollower = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await findOr404(User, req.user._id, "Current user not found");

    if (!currentUser.followers.includes(userId)) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "This user is not following you");
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

    successResponse(res, HTTP_STATUS.OK, "Follower removed successfully", null);
});

