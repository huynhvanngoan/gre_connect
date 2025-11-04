import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_TYPES } from "../../utils/constants.js";
import { findOr404 } from "../../utils/helpers.js";

/**
 * @desc    Vote on poll
 * @route   POST /api/posts/:postId/vote
 * @access  Private
 */
export const votePoll = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user._id;

    const post = await findOr404(Post, postId, "Post not found");

    if (post.postType !== POST_TYPES.POLL) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a poll");
    }

    if (!post.pollData || !post.pollData.options || !post.pollData.options[optionIndex]) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Invalid poll option");
    }

    await post.voteOnPoll(userId, optionIndex);

    successResponse(res, HTTP_STATUS.OK, "Vote recorded successfully");
});

/**
 * @desc    Get poll results
 * @route   GET /api/posts/:postId/poll/results
 * @access  Private
 */
export const getPollResults = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await findOr404(Post, postId, "Post not found");

    if (post.postType !== POST_TYPES.POLL) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not a poll");
    }

    const totalVotes = post.pollData.options.reduce((total, opt) => total + opt.votes.length, 0);

    const results = post.pollData.options.map((option, index) => ({
        index,
        text: option.text,
        votes: option.votes.length,
        percentage: totalVotes > 0 ? ((option.votes.length / totalVotes) * 100).toFixed(2) : 0,
        hasVoted: option.votes.some(id => id.toString() === req.user._id.toString()),
    }));

    successResponse(res, HTTP_STATUS.OK, "Poll results retrieved successfully", {
        question: post.pollData.question,
        totalVotes,
        results,
        isExpired: post.isExpired,
    });
});

