import asyncHandler from "express-async-handler";
import { Meeting } from "../../models/meeting.model.js";
import User from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { getIO } from "../../config/socket.js";
import {
    NOTIFICATION_TYPES,
    ROLES,
    SOCKET_EVENTS,
    ERROR_MESSAGES,
} from "../../utils/constants.js";
import { successResponse } from "../../utils/response.js";

/**
 * @desc    Get meeting participants
 * @route   GET /api/v1/meetings/:meetingId/participants
 * @access  Private
 */
export const getParticipants = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId)
        .populate("participants.user", "firstName lastName username profilePicture role");

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    successResponse(res, 200, "Participants retrieved successfully", {
        participants: meeting.participants,
        totalCount: meeting.participants.length,
    });
});

/**
 * @desc    Invite participant to meeting
 * @route   POST /api/v1/meetings/:meetingId/participants/invite
 * @access  Private (Host, Co-host)
 */
export const inviteParticipant = asyncHandler(async (req, res) => {
    const { userId } = req.body;
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

    // Check if already a participant
    const alreadyParticipant = meeting.participants.some((p) =>
        p.user.equals(userId)
    );

    if (alreadyParticipant) {
        res.status(400);
        throw new Error("User is already a participant");
    }

    // Add participant
    meeting.participants.push({
        user: userId,
        role: "participant",
    });

    await meeting.save();

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Send notification
    await Notification.createNotification({
        recipientId: userId,
        senderId: req.user._id,
        type: NOTIFICATION_TYPES.MEETING_INVITE,
        title: "Meeting Invitation",
        message: `${req.user.fullName} invited you to "${meeting.title}"`,
        metadata: { meetingId: meeting._id },
    });

    // Emit socket event
    const io = getIO();
    io.to(userId.toString()).emit(SOCKET_EVENTS.MEETING_INVITE, {
        meetingId: meeting._id,
        title: meeting.title,
    });

    successResponse(res, 200, "Participant invited successfully", meeting);
});

/**
 * @desc    Remove participant from meeting
 * @route   DELETE /api/v1/meetings/:meetingId/participants/:userId
 * @access  Private (Host, Co-host)
 */
export const removeParticipant = asyncHandler(async (req, res) => {
    const { userId } = req.params;
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

    // Cannot remove host
    if (meeting.host.equals(userId)) {
        res.status(400);
        throw new Error("Cannot remove the host from the meeting");
    }

    // Remove participant
    meeting.participants = meeting.participants.filter(
        (p) => !p.user.equals(userId)
    );

    await meeting.save();

    // Emit socket event
    const io = getIO();
    io.to(userId.toString()).emit(SOCKET_EVENTS.PARTICIPANT_REMOVED, {
        meetingId: meeting._id,
    });

    successResponse(res, 200, "Participant removed successfully", meeting);
});

/**
 * @desc    Update participant role
 * @route   PUT /api/v1/meetings/:meetingId/participants/:userId/role
 * @access  Private (Host)
 */
export const updateParticipantRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    const meeting = await Meeting.findById(req.params.meetingId);

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Only host can change roles
    if (!meeting.host.equals(req.user._id)) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NO_PERMISSION);
    }

    // Find participant
    const participant = meeting.participants.find((p) =>
        p.user.equals(userId)
    );

    if (!participant) {
        res.status(404);
        throw new Error("Participant not found");
    }

    // Update role
    participant.role = role;

    // If promoted to co-host, add to coHosts array
    if (role === "co-host" && !meeting.coHosts.some((id) => id.equals(userId))) {
        meeting.coHosts.push(userId);
    }

    // If demoted from co-host, remove from coHosts array
    if (role !== "co-host") {
        meeting.coHosts = meeting.coHosts.filter((id) => !id.equals(userId));
    }

    await meeting.save();

    // Emit socket event
    const io = getIO();
    io.to(meeting._id.toString()).emit(SOCKET_EVENTS.PARTICIPANT_ROLE_UPDATED, {
        meetingId: meeting._id,
        userId,
        role,
    });

    successResponse(res, 200, "Participant role updated successfully", meeting);
});

/**
 * @desc    Mute participant
 * @route   POST /api/v1/meetings/:meetingId/participants/:userId/mute
 * @access  Private (Host, Co-host)
 */
export const muteParticipant = asyncHandler(async (req, res) => {
    const { userId } = req.params;
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

    // Find participant
    const participant = meeting.participants.find((p) =>
        p.user.equals(userId)
    );

    if (!participant) {
        res.status(404);
        throw new Error("Participant not found");
    }

    // Mute participant
    participant.isAudioEnabled = false;
    await meeting.save();

    // Emit socket event
    const io = getIO();
    io.to(meeting._id.toString()).emit(SOCKET_EVENTS.PARTICIPANT_MUTED, {
        meetingId: meeting._id,
        userId,
    });

    successResponse(res, 200, "Participant muted successfully", meeting);
});

/**
 * @desc    Unmute participant
 * @route   POST /api/v1/meetings/:meetingId/participants/:userId/unmute
 * @access  Private (Host, Co-host)
 */
export const unmuteParticipant = asyncHandler(async (req, res) => {
    const { userId } = req.params;
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

    // Find participant
    const participant = meeting.participants.find((p) =>
        p.user.equals(userId)
    );

    if (!participant) {
        res.status(404);
        throw new Error("Participant not found");
    }

    // Unmute participant
    participant.isAudioEnabled = true;
    await meeting.save();

    // Emit socket event
    const io = getIO();
    io.to(meeting._id.toString()).emit(SOCKET_EVENTS.PARTICIPANT_UNMUTED, {
        meetingId: meeting._id,
        userId,
    });

    successResponse(res, 200, "Participant unmuted successfully", meeting);
});

