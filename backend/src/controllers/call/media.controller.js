import asyncHandler from "express-async-handler";
import { Call } from "../../models/call.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Toggle audio on/off
 * @route   PUT /api/v1/calls/:callId/audio
 * @access  Private
 */
export const toggleAudio = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const { enabled } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    const participant = call.participants.find(p => p.user.equals(userId));
    if (!participant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not in this call");
    }

    participant.audio = enabled;
    await call.save();

    // Notify other participants
    const io = getIO();
    call.participants.forEach(p => {
        if (!p.user.equals(userId)) {
            io.to(p.user.toString()).emit("user-audio-toggled", {
                callId: call._id,
                userId,
                isAudioEnabled: enabled,
            });
        }
    });

    successResponse(res, HTTP_STATUS.OK, `Audio ${enabled ? 'enabled' : 'disabled'} successfully`);
});

/**
 * @desc    Toggle video on/off
 * @route   PUT /api/v1/calls/:callId/video
 * @access  Private
 */
export const toggleVideo = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const { enabled } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    const participant = call.participants.find(p => p.user.equals(userId));
    if (!participant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not in this call");
    }

    participant.video = enabled;
    await call.save();

    // Notify other participants
    const io = getIO();
    call.participants.forEach(p => {
        if (!p.user.equals(userId)) {
            io.to(p.user.toString()).emit("user-video-toggled", {
                callId: call._id,
                userId,
                isVideoEnabled: enabled,
            });
        }
    });

    successResponse(res, HTTP_STATUS.OK, `Video ${enabled ? 'enabled' : 'disabled'} successfully`);
});

