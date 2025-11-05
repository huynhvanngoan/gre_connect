import asyncHandler from "express-async-handler";
import { Comment } from "../../models/comment.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Get all comments by a user
 * @route   GET /api/comments/user/:userId
 * @access  Private
 */
export const getUserComments = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const comments = await Comment.findByUser(userId)
        .limit(parseInt(limit))
        .skip(skip)
        .populate("post", "content postType")
        .lean();

    const total = await Comment.countDocuments({
        user: userId,
        isActive: true,
    });

    // Add virtual fields
    const commentsWithVirtuals = comments.map(comment => ({
        ...comment,
        likesCount: comment.likes?.length || 0,
        repliesCount: comment.replies?.length || 0,
    }));

    successResponse(res, HTTP_STATUS.OK, "User comments retrieved successfully", {
        comments: commentsWithVirtuals,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

