import asyncHandler from "express-async-handler";
import { Call } from "../../models/call.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Get call history for current user
 * @route   GET /api/v1/calls/history
 * @access  Private
 */
export const getCallHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { limit = 50, page = 1, callType, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {
        "participants.user": userId,
    };

    if (callType) {
        query.callType = callType;
    }

    if (status) {
        query.status = status;
    }

    const calls = await Call.find(query)
        .populate("caller", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean();

    const total = await Call.countDocuments(query);

    // Add call direction (incoming/outgoing) for each call
    const callsWithDirection = calls.map(call => ({
        ...call,
        direction: call.caller._id.toString() === userId.toString() ? "outgoing" : "incoming",
    }));

    successResponse(res, HTTP_STATUS.OK, "Call history retrieved", {
        calls: callsWithDirection,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get call details by ID
 * @route   GET /api/v1/calls/:callId
 * @access  Private
 */
export const getCallById = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId)
        .populate("caller", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture");

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Check if user is a participant
    const isParticipant = call.participants.some(p => p.user._id.equals(userId));
    if (!isParticipant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view this call");
    }

    successResponse(res, HTTP_STATUS.OK, "Call retrieved", { call });
});

