import asyncHandler from "express-async-handler";
import { Meeting } from "../../models/meeting.model.js";
import { getIO } from "../../config/socket.js";
import {
    SOCKET_EVENTS,
    ERROR_MESSAGES,
    ROLES,
} from "../../utils/constants.js";
import { successResponse } from "../../utils/response.js";

/**
 * @desc    Toggle recording for a meeting
 * @route   POST /api/v1/meetings/:meetingId/recording/toggle
 * @access  Private (Host, Co-host)
 */
export const toggleRecording = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId);

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check permissions
    const isHost = meeting.host.equals(req.user._id);
    const isCoHost = meeting.coHosts.some((id) => id.equals(req.user._id));

    if (!isHost && !isCoHost) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NO_PERMISSION);
    }

    // Check if recording is enabled in settings
    if (!meeting.settings.isRecordingEnabled) {
        res.status(400);
        throw new Error("Recording is not enabled for this meeting");
    }

    // Toggle recording
    const isRecording = meeting.isRecording || false;
    meeting.isRecording = !isRecording;

    if (!isRecording) {
        // Start recording
        meeting.recordingStartTime = new Date();
        meeting.recordings = meeting.recordings || [];
    } else {
        // Stop recording
        meeting.recordingEndTime = new Date();

        // Create recording entry
        if (meeting.recordingStartTime) {
            const duration = Math.floor(
                (meeting.recordingEndTime - meeting.recordingStartTime) / 1000
            );

            meeting.recordings.push({
                startTime: meeting.recordingStartTime,
                endTime: meeting.recordingEndTime,
                duration,
                recordedBy: req.user._id,
                status: "completed",
            });
        }
    }

    await meeting.save();

    // Emit socket event
    const io = getIO();
    io.to(meeting._id.toString()).emit(SOCKET_EVENTS.RECORDING_TOGGLED, {
        meetingId: meeting._id,
        isRecording: meeting.isRecording,
    });

    successResponse(res, 200, `Recording ${meeting.isRecording ? "started" : "stopped"} successfully`, {
        isRecording: meeting.isRecording,
        recordings: meeting.recordings,
    });
});

/**
 * @desc    Get meeting recordings
 * @route   GET /api/v1/meetings/:meetingId/recordings
 * @access  Private (Host, Co-host, Participants)
 */
export const getRecordings = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId)
        .populate("recordings.recordedBy", "firstName lastName username");

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check if user is participant or host
    const isParticipant = meeting.participants.some((p) =>
        p.user.equals(req.user._id)
    );
    const isHost = meeting.host.equals(req.user._id);

    if (!isParticipant && !isHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NO_PERMISSION);
    }

    successResponse(res, 200, "Recordings retrieved successfully", {
        recordings: meeting.recordings || [],
        isRecording: meeting.isRecording || false,
    });
});

