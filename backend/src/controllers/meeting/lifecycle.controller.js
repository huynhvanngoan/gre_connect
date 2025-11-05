import asyncHandler from "express-async-handler";
import { Meeting } from "../../models/meeting.model.js";
import { Notification } from "../../models/notification.model.js";
import { getIO } from "../../config/socket.js";
import {
    MEETING_STATUS,
    MEETING_TYPES,
    NOTIFICATION_TYPES,
    ROLES,
    SOCKET_EVENTS,
    ERROR_MESSAGES,
} from "../../utils/constants.js";
import { successResponse } from "../../utils/response.js";
import { generateRtcToken, getAgoraAppId } from "../../services/agora.service.js";

/**
 * @desc    Start a meeting
 * @route   POST /api/v1/meetings/:meetingId/start
 * @access  Private (Host, Co-host)
 */
export const startMeeting = asyncHandler(async (req, res) => {
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
        throw new Error("Only host or co-host can start the meeting");
    }

    // Check if already started
    if (meeting.status === MEETING_STATUS.ONGOING) {
        res.status(400);
        throw new Error("Meeting is already ongoing");
    }

    // Start meeting
    meeting.status = MEETING_STATUS.ONGOING;
    meeting.actualStartTime = new Date();
    await meeting.save();

    // Notify participants
    const io = getIO();
    meeting.participants.forEach((participant) => {
        io.to(participant.user.toString()).emit(SOCKET_EVENTS.MEETING_STARTED, {
            meetingId: meeting._id,
            title: meeting.title,
        });
    });

    successResponse(res, 200, "Meeting started successfully", meeting);
});

/**
 * @desc    End a meeting
 * @route   POST /api/v1/meetings/:meetingId/end
 * @access  Private (Host, Co-host)
 */
export const endMeeting = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId);

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check permissions
    const isHost = meeting.host.equals(req.user._id);
    const isCoHost = meeting.coHosts.some((id) => id.equals(req.user._id));

    if (!isHost && !isCoHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error("Only host, co-host, or staff can end the meeting");
    }

    // Check if meeting is ongoing
    if (meeting.status !== MEETING_STATUS.ONGOING) {
        res.status(400);
        throw new Error("Meeting is not ongoing");
    }

    // End meeting
    meeting.status = MEETING_STATUS.ENDED;
    meeting.actualEndTime = new Date();

    // Update all participants to left
    meeting.participants.forEach((participant) => {
        if (!participant.leftAt) {
            participant.leftAt = new Date();
        }
    });

    // Calculate duration
    if (meeting.actualStartTime) {
        const durationMs = meeting.actualEndTime - meeting.actualStartTime;
        meeting.duration = Math.floor(durationMs / 1000); // in seconds
    }

    await meeting.save();

    // Notify participants
    const io = getIO();
    meeting.participants.forEach((participant) => {
        io.to(participant.user.toString()).emit(SOCKET_EVENTS.MEETING_ENDED, {
            meetingId: meeting._id,
        });
    });

    successResponse(res, 200, "Meeting ended successfully", meeting);
});

/**
 * @desc    Join a meeting
 * @route   POST /api/v1/meetings/:meetingId/join
 * @access  Private
 */
export const joinMeeting = asyncHandler(async (req, res) => {
    const { displayName, isAudioEnabled = true, isVideoEnabled = true } = req.body;

    const meeting = await Meeting.findById(req.params.meetingId)
        .populate("host", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture");

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check if meeting has ended
    if (meeting.status === MEETING_STATUS.ENDED) {
        res.status(400);
        throw new Error(ERROR_MESSAGES.MEETING_ENDED || "Meeting has ended");
    }

    // Check if meeting is cancelled
    if (meeting.status === MEETING_STATUS.CANCELLED) {
        res.status(400);
        throw new Error("Meeting has been cancelled");
    }

    // Check if user is allowed to join
    const participant = meeting.participants.find((p) =>
        p.user._id.equals(req.user._id)
    );

    if (!participant && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error("You are not invited to this meeting");
    }

    // Check max participants
    const activeParticipants = meeting.participants.filter(
        (p) => p.joinedAt && !p.leftAt
    );

    if (
        meeting.maxParticipants &&
        activeParticipants.length >= meeting.maxParticipants
    ) {
        res.status(400);
        throw new Error("Meeting is full");
    }

    // If meeting not started yet, start it
    if (meeting.status === MEETING_STATUS.SCHEDULED) {
        const isHost = meeting.host._id.equals(req.user._id);
        if (isHost || meeting.meetingType === MEETING_TYPES.INSTANT) {
            meeting.status = MEETING_STATUS.ONGOING;
            meeting.actualStartTime = new Date();
        }
    }

    // Update participant
    if (participant) {
        participant.joinedAt = new Date();
        participant.leftAt = null;
        participant.isAudioEnabled = isAudioEnabled;
        participant.isVideoEnabled = isVideoEnabled;
    } else {
        // Staff joining
        meeting.participants.push({
            user: req.user._id,
            role: "participant",
            joinedAt: new Date(),
            isAudioEnabled,
            isVideoEnabled,
        });
    }

    await meeting.save();

    // Generate Agora token for joining user
    let agoraToken = null;
    try {
        if (meeting.agoraChannel?.channelName) {
            agoraToken = generateRtcToken(
                meeting.agoraChannel.channelName,
                req.user._id.toString(),
                3600,
                'publisher'
            );
        }
    } catch (error) {
        console.error("Failed to generate Agora token for meeting join:", error.message);
    }

    // Notify other participants
    const io = getIO();
    meeting.participants.forEach((p) => {
        if (!p.user._id.equals(req.user._id)) {
            io.to(p.user._id.toString()).emit(SOCKET_EVENTS.PARTICIPANT_JOINED, {
                meetingId: meeting._id,
                participant: {
                    userId: req.user._id,
                    name: req.user.fullName,
                    profilePicture: req.user.profilePicture,
                },
            });
        }
    });

    successResponse(res, 200, "Joined meeting successfully", {
        meeting,
        agora: {
            appId: getAgoraAppId(),
            channelName: meeting.agoraChannel?.channelName,
            token: agoraToken,
        },
    });
});

/**
 * @desc    Leave a meeting
 * @route   POST /api/v1/meetings/:meetingId/leave
 * @access  Private
 */
export const leaveMeeting = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId);

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Find participant
    const participant = meeting.participants.find((p) =>
        p.user.equals(req.user._id)
    );

    if (!participant) {
        res.status(400);
        throw new Error("You are not in this meeting");
    }

    // Update participant
    participant.leftAt = new Date();

    await meeting.save();

    // Notify other participants
    const io = getIO();
    meeting.participants.forEach((p) => {
        if (!p.user.equals(req.user._id)) {
            io.to(p.user.toString()).emit(SOCKET_EVENTS.PARTICIPANT_LEFT, {
                meetingId: meeting._id,
                userId: req.user._id,
            });
        }
    });

    successResponse(res, 200, "Left meeting successfully", null);
});

/**
 * @desc    Cancel a meeting
 * @route   POST /api/v1/meetings/:meetingId/cancel
 * @access  Private (Host, Staff)
 */
export const cancelMeeting = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId);

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check permissions
    const isHost = meeting.host.equals(req.user._id);
    const isCoHost = meeting.coHosts.some((id) => id.equals(req.user._id));

    if (!isHost && !isCoHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NO_PERMISSION);
    }

    // Cannot cancel ongoing or ended meeting
    if (meeting.status === MEETING_STATUS.ONGOING || meeting.status === MEETING_STATUS.ENDED) {
        res.status(400);
        throw new Error("Cannot cancel this meeting");
    }

    // Cancel meeting
    meeting.status = MEETING_STATUS.CANCELLED;
    await meeting.save();

    // Notify participants
    const notifications = meeting.participants
        .filter((p) => !p.user.equals(req.user._id))
        .map((participant) => ({
            user: participant.user,
            type: NOTIFICATION_TYPES.MEETING_CANCELLED,
            title: "Meeting Cancelled",
            message: `"${meeting.title}" has been cancelled`,
            data: { meetingId: meeting._id },
        }));

    if (notifications.length > 0) {
        await Notification.insertMany(notifications);
    }

    // Emit socket events
    const io = getIO();
    meeting.participants.forEach((participant) => {
        io.to(participant.user.toString()).emit(SOCKET_EVENTS.MEETING_CANCELLED, {
            meetingId: meeting._id,
        });
    });

    successResponse(res, 200, "Meeting cancelled successfully", null);
});

/**
 * @desc    Reschedule a meeting
 * @route   POST /api/v1/meetings/:meetingId/reschedule
 * @access  Private (Host, Co-host)
 */
export const rescheduleMeeting = asyncHandler(async (req, res) => {
    const { scheduledStartTime, scheduledEndTime } = req.body;

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

    // Cannot reschedule ongoing or ended meeting
    if (meeting.status === MEETING_STATUS.ONGOING || meeting.status === MEETING_STATUS.ENDED) {
        res.status(400);
        throw new Error("Cannot reschedule this meeting");
    }

    // Update schedule
    if (scheduledStartTime) {
        meeting.scheduledStartTime = new Date(scheduledStartTime);
    }
    if (scheduledEndTime) {
        meeting.scheduledEndTime = new Date(scheduledEndTime);
    }

    await meeting.save();

    // Notify participants
    const notifications = meeting.participants
        .filter((p) => !p.user.equals(req.user._id))
        .map((participant) => ({
            user: participant.user,
            type: NOTIFICATION_TYPES.MEETING_RESCHEDULED,
            title: "Meeting Rescheduled",
            message: `"${meeting.title}" has been rescheduled`,
            data: {
                meetingId: meeting._id,
                newStartTime: meeting.scheduledStartTime,
            },
        }));

    if (notifications.length > 0) {
        await Notification.insertMany(notifications);
    }

    // Emit socket events
    const io = getIO();
    meeting.participants.forEach((participant) => {
        io.to(participant.user.toString()).emit(SOCKET_EVENTS.MEETING_RESCHEDULED, {
            meetingId: meeting._id,
            scheduledStartTime: meeting.scheduledStartTime,
        });
    });

    successResponse(res, 200, "Meeting rescheduled successfully", meeting);
});

