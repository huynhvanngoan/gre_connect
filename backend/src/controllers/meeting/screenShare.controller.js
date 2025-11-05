import asyncHandler from "express-async-handler";
import { Meeting } from "../../models/meeting.model.js";
import { getIO } from "../../config/socket.js";
import {
    SOCKET_EVENTS,
    ERROR_MESSAGES,
} from "../../utils/constants.js";
import { successResponse } from "../../utils/response.js";

/**
 * @desc    Start screen sharing
 * @route   POST /api/v1/meetings/:meetingId/screen-share
 * @access  Private
 */
export const shareScreen = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId);

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check if screen sharing is allowed
    if (!meeting.settings.allowParticipantsToShare) {
        res.status(400);
        throw new Error("Screen sharing is not allowed for this meeting");
    }

    // Check if user is participant
    const participant = meeting.participants.find((p) =>
        p.user.equals(req.user._id)
    );

    if (!participant) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NOT_MEETING_PARTICIPANT);
    }

    // Check permissions
    const isHost = meeting.host.equals(req.user._id);
    const isCoHost = meeting.coHosts.some((id) => id.equals(req.user._id));
    const isPresenter = participant.role === "presenter";

    if (
        !isHost &&
        !isCoHost &&
        !isPresenter &&
        !meeting.settings.allowParticipantsToShare
    ) {
        res.status(403);
        throw new Error("You don't have permission to share screen");
    }

    // Update participant screen sharing status
    participant.isSharingScreen = true;
    await meeting.save();

    // Notify other participants
    const io = getIO();
    meeting.participants.forEach((p) => {
        if (!p.user.equals(req.user._id)) {
            io.to(p.user.toString()).emit(SOCKET_EVENTS.SCREEN_SHARE_STARTED, {
                meetingId: meeting._id,
                userId: req.user._id,
                userName: req.user.fullName,
            });
        }
    });

    successResponse(res, 200, "Screen sharing started successfully", null);
});

/**
 * @desc    Stop screen sharing
 * @route   POST /api/v1/meetings/:meetingId/screen-share/stop
 * @access  Private
 */
export const stopScreenShare = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId);

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check if user is participant
    const participant = meeting.participants.find((p) =>
        p.user.equals(req.user._id)
    );

    if (!participant) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NOT_MEETING_PARTICIPANT);
    }

    // Check if user is the one sharing
    if (!participant.isSharingScreen) {
        res.status(400);
        throw new Error("You are not currently sharing your screen");
    }

    // Stop screen sharing
    participant.isSharingScreen = false;
    await meeting.save();

    // Notify other participants
    const io = getIO();
    meeting.participants.forEach((p) => {
        if (!p.user.equals(req.user._id)) {
            io.to(p.user.toString()).emit(SOCKET_EVENTS.SCREEN_SHARE_STOPPED, {
                meetingId: meeting._id,
                userId: req.user._id,
            });
        }
    });

    successResponse(res, 200, "Screen sharing stopped successfully", null);
});

