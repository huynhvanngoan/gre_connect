import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_TYPES } from "../../utils/constants.js";

/**
 * @desc    Acknowledge announcement
 * @route   POST /api/posts/:postId/acknowledge
 * @access  Private
 */
export const acknowledgeAnnouncement = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Post not found");
    }

    if (post.postType !== POST_TYPES.ANNOUNCEMENT) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not an announcement");
    }

    await post.acknowledge(userId);

    successResponse(res, HTTP_STATUS.OK, "Announcement acknowledged successfully");
});

