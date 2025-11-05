import asyncHandler from "express-async-handler";
import { Call } from "../../models/call.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { generateRtcToken, getAgoraAppId } from "../../services/agora.service.js";

/**
 * @desc    Get Agora token for a call
 * @route   GET /api/v1/calls/:callId/token
 * @access  Private
 */
export const getCallToken = asyncHandler(async (req, res) => {
    const { callId } = req.params;
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

    // Generate new token
    let token = null;
    try {
        if (call.agoraChannel?.channelName) {
            token = generateRtcToken(
                call.agoraChannel.channelName,
                userId.toString(),
                3600,
                'publisher'
            );
        }
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        throw new Error(`Failed to generate token: ${error.message}`);
    }

    successResponse(res, HTTP_STATUS.OK, "Token generated successfully", {
        appId: getAgoraAppId(),
        channelName: call.agoraChannel?.channelName,
        token,
    });
});

