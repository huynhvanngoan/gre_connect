import asyncHandler from "express-async-handler";
import { Meeting } from "../models/meeting.model.js";
import User from "../models/user.model.js";
import Class from "../models/class.model.js";
import { Notification } from "../models/notification.model.js";
import { getIO } from "../config/socket.js";
import {
    MEETING_STATUS,
    MEETING_TYPES,
    NOTIFICATION_TYPES,
    ROLES,
    SOCKET_EVENTS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
} from "../utils/constants.js";
import { successResponse, errorResponse } from "../utils/response.js";

// ============================================
// MEETING CRUD OPERATIONS
// ============================================

/**
 * @desc    Create a new meeting
 * @route   POST /api/v1/meetings
 * @access  Private (Teacher, Staff)
 */
export const createMeeting = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        meetingType,
        scheduledStartTime,
        scheduledEndTime,
        classId,
        maxParticipants,
        isRecordingEnabled,
        waitingRoomEnabled,
        requireApproval,
        allowParticipantsToShare,
        allowChat,
        invitedUsers,
    } = req.body;

    // Check permissions (only teacher and staff can create meetings)
    if (req.user.role === ROLES.STUDENT) {
        res.status(403);
        throw new Error("Students cannot create meetings");
    }

    // Validate class if provided
    let classData = null;
    if (classId) {
        classData = await Class.findById(classId);
        if (!classData) {
            res.status(404);
            throw new Error("Class not found");
        }

        // Check if user is the teacher of the class
        const isMainTeacher = classData.mainTeacher.equals(req.user._id);
        const isAssistantTeacher = classData.assistantTeachers.some(
            (id) => id.equals(req.user._id)
        );

        if (!isMainTeacher && !isAssistantTeacher && req.user.role !== ROLES.STAFF) {
            res.status(403);
            throw new Error("You are not authorized to create meetings for this class");
        }
    }

    // Create meeting
    const meeting = await Meeting.create({
        title,
        description,
        meetingType,
        scheduledStartTime,
        scheduledEndTime,
        host: req.user._id,
        classId,
        maxParticipants,
        settings: {
            isRecordingEnabled: isRecordingEnabled || false,
            waitingRoomEnabled: waitingRoomEnabled || false,
            requireApproval: requireApproval || false,
            allowParticipantsToShare: allowParticipantsToShare !== false,
            allowChat: allowChat !== false,
        },
        status: MEETING_STATUS.SCHEDULED,
    });

    // Add host as participant with host role
    meeting.participants.push({
        user: req.user._id,
        role: "host",
    });

    // Add invited users as participants
    if (invitedUsers && invitedUsers.length > 0) {
        const uniqueUsers = [...new Set(invitedUsers)].filter(
            (userId) => !userId.equals(req.user._id)
        );

        for (const userId of uniqueUsers) {
            meeting.participants.push({
                user: userId,
                role: "participant",
            });
        }

        // Create notifications for invited users
        const notifications = uniqueUsers.map((userId) => ({
            user: userId,
            type: NOTIFICATION_TYPES.MEETING_INVITE,
            title: "Meeting Invitation",
            message: `${req.user.fullName} invited you to "${title}"`,
            data: {
                meetingId: meeting._id,
                hostId: req.user._id,
                hostName: req.user.fullName,
                scheduledStartTime,
            },
        }));

        await Notification.insertMany(notifications);

        // Emit socket events
        const io = getIO();
        uniqueUsers.forEach((userId) => {
            io.to(userId.toString()).emit(SOCKET_EVENTS.NOTIFICATION, {
                type: NOTIFICATION_TYPES.MEETING_INVITE,
                meetingId: meeting._id,
                title,
            });
        });
    }

    // If class meeting, add all class members
    if (classData) {
        const classMembers = [
            ...classData.students,
            ...classData.assistantTeachers,
        ].filter((id) => !id.equals(req.user._id));

        for (const memberId of classMembers) {
            const alreadyInvited = meeting.participants.some((p) =>
                p.user.equals(memberId)
            );
            if (!alreadyInvited) {
                meeting.participants.push({
                    user: memberId,
                    role: "participant",
                });
            }
        }
    }

    await meeting.save();

    // Populate meeting data
    await meeting.populate([
        { path: "host", select: "firstName lastName username profilePicture" },
        { path: "participants.user", select: "firstName lastName username profilePicture" },
        { path: "classId", select: "name code subject" },
    ]);

    successResponse(res, 201, SUCCESS_MESSAGES.MEETING_CREATED || "Meeting created successfully", meeting);
});

/**
 * @desc    Get meeting by ID
 * @route   GET /api/v1/meetings/:meetingId
 * @access  Private
 */
export const getMeetingById = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId)
        .populate("host", "firstName lastName username profilePicture role")
        .populate("participants.user", "firstName lastName username profilePicture role")
        .populate("coHosts", "firstName lastName username profilePicture")
        .populate("classId", "name code subject grade");

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check if user is participant
    const isParticipant = meeting.participants.some((p) =>
        p.user._id.equals(req.user._id)
    );
    const isHost = meeting.host._id.equals(req.user._id);

    if (!isParticipant && !isHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NOT_MEETING_PARTICIPANT);
    }

    successResponse(res, 200, "Meeting retrieved successfully", meeting);
});

/**
 * @desc    Update meeting
 * @route   PUT /api/v1/meetings/:meetingId
 * @access  Private (Host, Co-host, Staff)
 */
export const updateMeeting = asyncHandler(async (req, res) => {
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

    // Update allowed fields
    const allowedUpdates = [
        "title",
        "description",
        "scheduledStartTime",
        "scheduledEndTime",
        "maxParticipants",
        "status",
    ];

    allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
            meeting[field] = req.body[field];
        }
    });

    await meeting.save();

    // Notify participants about update
    const io = getIO();
    meeting.participants.forEach((participant) => {
        io.to(participant.user.toString()).emit(SOCKET_EVENTS.MEETING_UPDATED, {
            meetingId: meeting._id,
            updates: req.body,
        });
    });

    successResponse(res, 200, "Meeting updated successfully", meeting);
});

/**
 * @desc    Delete meeting
 * @route   DELETE /api/v1/meetings/:meetingId
 * @access  Private (Host, Staff)
 */
export const deleteMeeting = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId);

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check permissions
    const isHost = meeting.host.equals(req.user._id);

    if (!isHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NO_PERMISSION);
    }

    // Cannot delete ongoing meeting
    if (meeting.status === MEETING_STATUS.ONGOING) {
        res.status(400);
        throw new Error("Cannot delete an ongoing meeting. Please end it first.");
    }

    await meeting.deleteOne();

    successResponse(res, 200, "Meeting deleted successfully", null);
});

/**
 * @desc    Get all meetings with filters
 * @route   GET /api/v1/meetings
 * @access  Private
 */
export const getMeetings = asyncHandler(async (req, res) => {
    const {
        limit = 20,
        page = 1,
        status,
        meetingType,
        classId,
        startDate,
        endDate,
    } = req.query;

    const query = {};

    // Filter by status
    if (status) {
        query.status = status;
    }

    // Filter by meeting type
    if (meetingType) {
        query.meetingType = meetingType;
    }

    // Filter by class
    if (classId) {
        query.classId = classId;
    }

    // Filter by date range
    if (startDate || endDate) {
        query.scheduledStartTime = {};
        if (startDate) {
            query.scheduledStartTime.$gte = new Date(startDate);
        }
        if (endDate) {
            query.scheduledStartTime.$lte = new Date(endDate);
        }
    }

    // User can only see meetings they're part of (unless staff)
    if (req.user.role !== ROLES.STAFF) {
        query.$or = [
            { host: req.user._id },
            { "participants.user": req.user._id },
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const meetings = await Meeting.find(query)
        .populate("host", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture")
        .populate("classId", "name code subject")
        .sort({ scheduledStartTime: -1 })
        .limit(parseInt(limit))
        .skip(skip);

    const total = await Meeting.countDocuments(query);

    successResponse(res, 200, "Meetings retrieved successfully", {
        meetings,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            limit: parseInt(limit),
        },
    });
});

/**
 * @desc    Get current user's meetings
 * @route   GET /api/v1/meetings/my
 * @access  Private
 */
export const getMyMeetings = asyncHandler(async (req, res) => {
    const meetings = await Meeting.find({
        $or: [
            { host: req.user._id },
            { "participants.user": req.user._id },
        ],
    })
        .populate("host", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture")
        .populate("classId", "name code subject")
        .sort({ scheduledStartTime: -1 })
        .limit(50);

    successResponse(res, 200, "Your meetings retrieved successfully", meetings);
});

/**
 * @desc    Get active meetings
 * @route   GET /api/v1/meetings/active
 * @access  Private
 */
export const getActiveMeetings = asyncHandler(async (req, res) => {
    const meetings = await Meeting.find({
        status: MEETING_STATUS.ONGOING,
        $or: [
            { host: req.user._id },
            { "participants.user": req.user._id },
        ],
    })
        .populate("host", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture")
        .sort({ actualStartTime: -1 });

    successResponse(res, 200, "Active meetings retrieved successfully", meetings);
});

/**
 * @desc    Get upcoming meetings
 * @route   GET /api/v1/meetings/upcoming
 * @access  Private
 */
export const getUpcomingMeetings = asyncHandler(async (req, res) => {
    const meetings = await Meeting.find({
        status: MEETING_STATUS.SCHEDULED,
        scheduledStartTime: { $gte: new Date() },
        $or: [
            { host: req.user._id },
            { "participants.user": req.user._id },
        ],
    })
        .populate("host", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture")
        .populate("classId", "name code subject")
        .sort({ scheduledStartTime: 1 })
        .limit(20);

    successResponse(res, 200, "Upcoming meetings retrieved successfully", meetings);
});

/**
 * @desc    Get past meetings
 * @route   GET /api/v1/meetings/past
 * @access  Private
 */
export const getPastMeetings = asyncHandler(async (req, res) => {
    const meetings = await Meeting.find({
        status: MEETING_STATUS.ENDED,
        $or: [
            { host: req.user._id },
            { "participants.user": req.user._id },
        ],
    })
        .populate("host", "firstName lastName username profilePicture")
        .populate("classId", "name code subject")
        .sort({ actualEndTime: -1 })
        .limit(50);

    successResponse(res, 200, "Past meetings retrieved successfully", meetings);
});

// ============================================
// MEETING LIFECYCLE OPERATIONS
// ============================================

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

    // Notify all participants
    const io = getIO();
    meeting.participants.forEach((participant) => {
        io.to(participant.user.toString()).emit(SOCKET_EVENTS.MEETING_STARTED, {
            meetingId: meeting._id,
            title: meeting.title,
        });
    });

    // Create notifications
    const notifications = meeting.participants
        .filter((p) => !p.user.equals(req.user._id))
        .map((p) => ({
            user: p.user,
            type: NOTIFICATION_TYPES.MEETING_STARTING,
            title: "Meeting Started",
            message: `${meeting.title} has started`,
            data: { meetingId: meeting._id },
        }));

    await Notification.insertMany(notifications);

    successResponse(res, 200, "Meeting started successfully", meeting);
});

/**
 * @desc    End a meeting
 * @route   POST /api/v1/meetings/:meetingId/end
 * @access  Private (Host, Co-host, Staff)
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

    // Notify all participants
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
        throw new Error(ERROR_MESSAGES.MEETING_ENDED);
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
        throw new Error(ERROR_MESSAGES.MEETING_FULL);
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

    successResponse(res, 200, "Joined meeting successfully", meeting);
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

    if (!isHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NO_PERMISSION);
    }

    // Cannot cancel ended meeting
    if (meeting.status === MEETING_STATUS.ENDED) {
        res.status(400);
        throw new Error("Cannot cancel an ended meeting");
    }

    meeting.status = MEETING_STATUS.CANCELLED;
    await meeting.save();

    // Notify all participants
    const notifications = meeting.participants
        .filter((p) => !p.user.equals(req.user._id))
        .map((p) => ({
            user: p.user,
            type: NOTIFICATION_TYPES.MEETING_CANCELLED,
            title: "Meeting Cancelled",
            message: `${meeting.title} has been cancelled`,
            data: { meetingId: meeting._id },
        }));

    await Notification.insertMany(notifications);

    const io = getIO();
    meeting.participants.forEach((p) => {
        io.to(p.user.toString()).emit(SOCKET_EVENTS.MEETING_ENDED, {
            meetingId: meeting._id,
            reason: "cancelled",
        });
    });

    successResponse(res, 200, "Meeting cancelled successfully", meeting);
});

/**
 * @desc    Reschedule a meeting
 * @route   POST /api/v1/meetings/:meetingId/reschedule
 * @access  Private (Host, Co-host, Staff)
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

    if (!isHost && !isCoHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NO_PERMISSION);
    }

    // Cannot reschedule ongoing or ended meeting
    if (
        meeting.status === MEETING_STATUS.ONGOING ||
        meeting.status === MEETING_STATUS.ENDED
    ) {
        res.status(400);
        throw new Error("Cannot reschedule an ongoing or ended meeting");
    }

    meeting.scheduledStartTime = scheduledStartTime;
    meeting.scheduledEndTime = scheduledEndTime;

    await meeting.save();

    // Notify participants
    const notifications = meeting.participants
        .filter((p) => !p.user.equals(req.user._id))
        .map((p) => ({
            user: p.user,
            type: NOTIFICATION_TYPES.MEETING_UPDATED,
            title: "Meeting Rescheduled",
            message: `${meeting.title} has been rescheduled`,
            data: {
                meetingId: meeting._id,
                newStartTime: scheduledStartTime,
                newEndTime: scheduledEndTime,
            },
        }));

    await Notification.insertMany(notifications);

    successResponse(res, 200, "Meeting rescheduled successfully", meeting);
});

// ============================================
// PARTICIPANT MANAGEMENT
// ============================================

/**
 * @desc    Get participants
 * @route   GET /api/v1/meetings/:meetingId/participants
 * @access  Private
 */
export const getParticipants = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId).populate(
        "participants.user",
        "firstName lastName username profilePicture role"
    );

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    successResponse(res, 200, "Participants retrieved successfully", meeting.participants);
});

/**
 * @desc    Invite participant
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

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if already participant
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

    // Create notification
    await Notification.create({
        user: userId,
        type: NOTIFICATION_TYPES.MEETING_INVITE,
        title: "Meeting Invitation",
        message: `${req.user.fullName} invited you to "${meeting.title}"`,
        data: { meetingId: meeting._id },
    });

    // Emit socket event
    const io = getIO();
    io.to(userId.toString()).emit(SOCKET_EVENTS.NOTIFICATION, {
        type: NOTIFICATION_TYPES.MEETING_INVITE,
        meetingId: meeting._id,
    });

    successResponse(res, 200, "Participant invited successfully", meeting);
});

/**
 * @desc    Remove participant
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
        throw new Error("Cannot remove the host");
    }

    // Remove participant
    meeting.participants = meeting.participants.filter(
        (p) => !p.user.equals(userId)
    );

    await meeting.save();

    // Notify removed user
    const io = getIO();
    io.to(userId).emit(SOCKET_EVENTS.PARTICIPANT_LEFT, {
        meetingId: meeting._id,
        reason: "removed",
    });

    successResponse(res, 200, "Participant removed successfully", meeting);
});

/**
 * @desc    Update participant role
 * @route   PUT /api/v1/meetings/:meetingId/participants/:userId/role
 * @access  Private (Host only)
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
        throw new Error("Only host can change participant roles");
    }

    // Find participant
    const participant = meeting.participants.find((p) => p.user.equals(userId));

    if (!participant) {
        res.status(404);
        throw new Error("Participant not found");
    }

    // Update role
    participant.role = role;

    // Update co-hosts array
    if (role === "co-host") {
        if (!meeting.coHosts.includes(userId)) {
            meeting.coHosts.push(userId);
        }
    } else {
        meeting.coHosts = meeting.coHosts.filter((id) => !id.equals(userId));
    }

    await meeting.save();

    successResponse(res, 200, "Participant role updated successfully", meeting);
});

/**
 * @desc    Mute participant
 * @route   POST /api/v1/meetings/:meetingId/participants/:userId/mute
 * @access  Private (Host, Co-host)
 */
export const muteParticipant = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { muted } = req.body;

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
    const participant = meeting.participants.find((p) => p.user.equals(userId));

    if (!participant) {
        res.status(404);
        throw new Error("Participant not found");
    }

    // Cannot mute host
    if (meeting.host.equals(userId)) {
        res.status(400);
        throw new Error("Cannot mute the host");
    }

    participant.isAudioEnabled = !muted;

    await meeting.save();

    // Notify participant
    const io = getIO();
    io.to(userId).emit(SOCKET_EVENTS.PARTICIPANT_LEFT, {
        meetingId: meeting._id,
        muted,
    });

    successResponse(res, 200, `Participant ${muted ? "muted" : "unmuted"} successfully`, null);
});

/**
 * @desc    Unmute participant
 * @route   POST /api/v1/meetings/:meetingId/participants/:userId/unmute
 * @access  Private (Host, Co-host)
 */
export const unmuteParticipant = asyncHandler(async (req, res) => {
    req.body.muted = false;
    return muteParticipant(req, res);
});

// ============================================
// RECORDING OPERATIONS
// ============================================

/**
 * @desc    Toggle recording
 * @route   POST /api/v1/meetings/:meetingId/recording/toggle
 * @access  Private (Host, Co-host)
 */
export const toggleRecording = asyncHandler(async (req, res) => {
    const { isRecording } = req.body;

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

    // Check if meeting is ongoing
    if (meeting.status !== MEETING_STATUS.ONGOING) {
        res.status(400);
        throw new Error("Meeting must be ongoing to toggle recording");
    }

    if (isRecording) {
        // Start recording
        meeting.recordings.push({
            startTime: new Date(),
            startedBy: req.user._id,
        });

        // Notify participants
        const io = getIO();
        meeting.participants.forEach((p) => {
            io.to(p.user.toString()).emit(SOCKET_EVENTS.RECORDING_STARTED, {
                meetingId: meeting._id,
            });
        });
    } else {
        // Stop recording
        const activeRecording = meeting.recordings.find((r) => !r.endTime);
        if (activeRecording) {
            activeRecording.endTime = new Date();
            const duration = Math.floor(
                (activeRecording.endTime - activeRecording.startTime) / 1000
            );
            activeRecording.duration = duration;
        }

        // Notify participants
        const io = getIO();
        meeting.participants.forEach((p) => {
            io.to(p.user.toString()).emit(SOCKET_EVENTS.RECORDING_STOPPED, {
                meetingId: meeting._id,
            });
        });
    }

    await meeting.save();

    successResponse(
        res,
        200,
        `Recording ${isRecording ? "started" : "stopped"} successfully`,
        meeting
    );
});

/**
 * @desc    Get recordings
 * @route   GET /api/v1/meetings/:meetingId/recordings
 * @access  Private
 */
export const getRecordings = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId).populate(
        "recordings.startedBy",
        "firstName lastName username"
    );

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check if user is participant
    const isParticipant = meeting.participants.some((p) =>
        p.user.equals(req.user._id)
    );
    const isHost = meeting.host.equals(req.user._id);

    if (!isParticipant && !isHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NOT_MEETING_PARTICIPANT);
    }

    successResponse(res, 200, "Recordings retrieved successfully", meeting.recordings);
});

// ============================================
// MEETING CHAT
// ============================================

/**
 * @desc    Send chat message
 * @route   POST /api/v1/meetings/:meetingId/chat
 * @access  Private
 */
export const sendMeetingChat = asyncHandler(async (req, res) => {
    const { message } = req.body;

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

    // Check if chat is allowed
    if (!meeting.settings.allowChat) {
        res.status(403);
        throw new Error("Chat is disabled for this meeting");
    }

    // Add chat message
    const chatMessage = {
        sender: req.user._id,
        message,
        timestamp: new Date(),
    };

    meeting.chatHistory.push(chatMessage);
    await meeting.save();

    // Populate sender info
    await meeting.populate({
        path: "chatHistory.sender",
        select: "firstName lastName username profilePicture",
    });

    // Broadcast to all participants
    const io = getIO();
    meeting.participants.forEach((p) => {
        io.to(p.user.toString()).emit(SOCKET_EVENTS.MEETING_CHAT_MESSAGE, {
            meetingId: meeting._id,
            message: chatMessage,
            sender: {
                _id: req.user._id,
                fullName: req.user.fullName,
                profilePicture: req.user.profilePicture,
            },
        });
    });

    successResponse(res, 200, "Message sent successfully", chatMessage);
});

/**
 * @desc    Get chat messages
 * @route   GET /api/v1/meetings/:meetingId/chat
 * @access  Private
 */
export const getMeetingChats = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId).populate(
        "chatHistory.sender",
        "firstName lastName username profilePicture"
    );

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check if user is participant
    const isParticipant = meeting.participants.some((p) =>
        p.user.equals(req.user._id)
    );

    if (!isParticipant && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NOT_MEETING_PARTICIPANT);
    }

    successResponse(res, 200, "Chat messages retrieved successfully", meeting.chatHistory);
});

// ============================================
// SCREEN SHARING
// ============================================

/**
 * @desc    Start screen sharing
 * @route   POST /api/v1/meetings/:meetingId/screen-share/start
 * @access  Private
 */
export const shareScreen = asyncHandler(async (req, res) => {
    const { isSharing } = req.body;

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

    participant.isSharingScreen = isSharing;
    await meeting.save();

    // Notify other participants
    const io = getIO();
    meeting.participants.forEach((p) => {
        if (!p.user.equals(req.user._id)) {
            io.to(p.user.toString()).emit(
                isSharing
                    ? SOCKET_EVENTS.SCREEN_SHARE_STARTED
                    : SOCKET_EVENTS.SCREEN_SHARE_STOPPED,
                {
                    meetingId: meeting._id,
                    userId: req.user._id,
                    userName: req.user.fullName,
                }
            );
        }
    });

    successResponse(
        res,
        200,
        `Screen sharing ${isSharing ? "started" : "stopped"} successfully`,
        null
    );
});

/**
 * @desc    Stop screen sharing
 * @route   POST /api/v1/meetings/:meetingId/screen-share/stop
 * @access  Private
 */
export const stopScreenShare = asyncHandler(async (req, res) => {
    req.body.isSharing = false;
    return shareScreen(req, res);
});

// ============================================
// STATISTICS
// ============================================

/**
 * @desc    Get meeting statistics
 * @route   GET /api/v1/meetings/:meetingId/stats
 * @access  Private (Host, Staff)
 */
export const getMeetingStats = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId).populate(
        "participants.user",
        "firstName lastName username"
    );

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check permissions
    const isHost = meeting.host.equals(req.user._id);

    if (!isHost && req.user.role !== ROLES.STAFF) {
        res.status(403);
        throw new Error(ERROR_MESSAGES.NO_PERMISSION);
    }

    // Calculate stats
    const stats = {
        totalParticipants: meeting.participants.length,
        joinedParticipants: meeting.participants.filter((p) => p.joinedAt).length,
        currentParticipants: meeting.participants.filter((p) => p.joinedAt && !p.leftAt)
            .length,
        duration: meeting.duration,
        recordings: meeting.recordings.length,
        chatMessages: meeting.chatHistory.length,
        averageJoinTime: null,
        participants: meeting.participants.map((p) => ({
            user: p.user,
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

// ============================================
// EXPORTS
// ============================================

export default {
    createMeeting,
    getMeetingById,
    updateMeeting,
    deleteMeeting,
    getMeetings,
    getMyMeetings,
    getActiveMeetings,
    getUpcomingMeetings,
    getPastMeetings,
    startMeeting,
    endMeeting,
    joinMeeting,
    leaveMeeting,
    cancelMeeting,
    rescheduleMeeting,
    getParticipants,
    inviteParticipant,
    removeParticipant,
    updateParticipantRole,
    muteParticipant,
    unmuteParticipant,
    toggleRecording,
    getRecordings,
    sendMeetingChat,
    getMeetingChats,
    shareScreen,
    stopScreenShare,
    getMeetingStats,
};