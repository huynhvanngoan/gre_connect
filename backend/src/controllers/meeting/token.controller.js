import asyncHandler from "express-async-handler";
import { Meeting } from "../../models/meeting.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { generateRtcToken, getAgoraAppId } from "../../services/agora.service.js";

/**
 * @desc    Get Agora token for a meeting
 * @route   GET /api/v1/meetings/:meetingId/token
 * @access  Private
 */
export const getMeetingToken = asyncHandler(async (req, res) => {
    const { meetingId } = req.params;
    const userId = req.user._id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Meeting not found");
    }

    // Check if user is a participant
    const participant = meeting.participants.find(p => p.user.equals(userId));
    if (!participant && req.user.role !== "staff") {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not a participant in this meeting");
    }

    // Generate new token
    let token = null;
    try {
        if (meeting.agoraChannel?.channelName) {
            // Determine role: host/co-host gets publisher, others get subscriber by default
            const role = participant?.role === "host" || participant?.role === "coHost" ? "publisher" : "publisher";
            token = generateRtcToken(
                meeting.agoraChannel.channelName,
                userId.toString(),
                3600,
                role
            );
        }
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        throw new Error(`Failed to generate token: ${error.message}`);
    }

    successResponse(res, HTTP_STATUS.OK, "Token generated successfully", {
        appId: getAgoraAppId(),
        channelName: meeting.agoraChannel?.channelName,
        token,
    });
});

