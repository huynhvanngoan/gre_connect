import asyncHandler from "express-async-handler";
import Post from "../../models/post.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, POST_TYPES, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { findOr404 } from "../../utils/helpers.js";

/**
 * @desc    RSVP to event
 * @route   POST /api/posts/:postId/rsvp
 * @access  Private
 */
export const rsvpEvent = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const post = await findOr404(Post, postId, "Post not found");

    if (post.postType !== POST_TYPES.EVENT) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not an event");
    }

    await post.respondToEvent(userId, status);

    // Notify event creator
    if (!post.user.equals(userId)) {
        await Notification.createNotification({
            recipientId: post.user,
            senderId: userId,
            type: NOTIFICATION_TYPES.EVENT_INVITATION,
            title: "Event RSVP",
            message: `${req.user.fullName} is ${status} for your event`,
            actionUrl: `/posts/${postId}`,
            postId: postId,
        });
    }

    successResponse(res, HTTP_STATUS.OK, "RSVP recorded successfully");
});

/**
 * @desc    Get event attendees
 * @route   GET /api/posts/:postId/attendees
 * @access  Private
 */
export const getEventAttendees = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await findOr404(Post, postId, "Post not found");

    await post.populate("eventData.attendees.user", "firstName lastName username profilePicture role");

    if (post.postType !== POST_TYPES.EVENT) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This is not an event");
    }

    const attendees = {
        going: post.eventData.attendees.filter(a => a.status === "going"),
        maybe: post.eventData.attendees.filter(a => a.status === "maybe"),
        notGoing: post.eventData.attendees.filter(a => a.status === "not_going"),
    };

    successResponse(res, HTTP_STATUS.OK, "Event attendees retrieved successfully", {
        attendees,
        totalGoing: attendees.going.length,
        totalMaybe: attendees.maybe.length,
        totalNotGoing: attendees.notGoing.length,
    });
});

