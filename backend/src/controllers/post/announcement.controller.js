import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_TYPES } from "../../utils/constants.js";
import { findOr404 } from "../../utils/helpers.js";

/**
 * @desc    Acknowledge announcement
 * @route   POST /api/posts/:postId/acknowledge
 * @access  Private
 */
export const acknowledgeAnnouncement = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await findOr404(Post, postId, "Post not found");

    if (post.postType !== POST_TYPES.ANNOUNCEMENT) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not an announcement");
    }

    if (!post.announcementData.requiresAcknowledgment) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This announcement does not require acknowledgment");
    }

    await post.acknowledgeAnnouncement(userId);

    successResponse(res, HTTP_STATUS.OK, "Announcement acknowledged successfully");
});

