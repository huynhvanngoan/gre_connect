import asyncHandler from "express-async-handler";
import { Call } from "../../models/call.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, CALL_STATUS } from "../../utils/constants.js";

/**
 * @desc    Rate a completed call
 * @route   POST /api/v1/calls/:callId/rate
 * @access  Private
 */
export const rateCall = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Check if user is a participant
    const participant = call.participants.find(p => p.user.equals(userId));
    if (!participant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not a participant in this call");
    }

    // Check if call has ended
    if (call.status !== CALL_STATUS.ENDED) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Can only rate completed calls");
    }

    // Check if already rated
    if (call.ratings && call.ratings.some(r => r.user.equals(userId))) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("You have already rated this call");
    }

    // Add rating
    if (!call.ratings) {
        call.ratings = [];
    }
    call.ratings.push({
        user: userId,
        rating,
        feedback: feedback || "",
    });

    await call.save();

    successResponse(res, HTTP_STATUS.OK, "Call rated successfully", {
        averageRating: call.averageRating || rating,
        totalRatings: call.ratings.length
    });
});

