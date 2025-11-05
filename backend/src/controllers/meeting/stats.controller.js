import asyncHandler from "express-async-handler";
import { Meeting } from "../../models/meeting.model.js";
import { ERROR_MESSAGES, ROLES } from "../../utils/constants.js";
import { successResponse } from "../../utils/response.js";

/**
 * @desc    Get meeting statistics
 * @route   GET /api/v1/meetings/:meetingId/stats
 * @access  Private (Host, Co-host, Staff)
 */
export const getMeetingStats = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId)
        .populate("participants.user", "firstName lastName username");

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

    // Calculate statistics
    const stats = {
        meetingId: meeting._id,
        title: meeting.title,
        status: meeting.status,
        duration: meeting.duration || null,
        scheduledStartTime: meeting.scheduledStartTime,
        scheduledEndTime: meeting.scheduledEndTime,
        actualStartTime: meeting.actualStartTime,
        actualEndTime: meeting.actualEndTime,
        totalParticipants: meeting.participants.length,
        activeParticipants: meeting.participants.filter(
            (p) => p.joinedAt && !p.leftAt
        ).length,
        participants: meeting.participants.map((p) => ({
            userId: p.user._id,
            name: p.user.fullName,
            role: p.role,
            joinedAt: p.joinedAt,
            leftAt: p.leftAt,
            duration: p.joinedAt && p.leftAt
                ? Math.floor((p.leftAt - p.joinedAt) / 1000)
                : null,
        })),
    };

    // Calculate average join time
    const joinedParticipants = meeting.participants.filter((p) => p.joinedAt);
    if (joinedParticipants.length > 0 && meeting.actualStartTime) {
        const totalJoinDelay = joinedParticipants.reduce((sum, p) => {
            const delay = Math.floor((p.joinedAt - meeting.actualStartTime) / 1000);
            return sum + Math.max(0, delay);
        }, 0);
        stats.averageJoinTime = Math.floor(totalJoinDelay / joinedParticipants.length);
    }

    successResponse(res, 200, "Meeting statistics retrieved successfully", stats);
});

