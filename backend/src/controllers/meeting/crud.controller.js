import asyncHandler from "express-async-handler";
import { Meeting } from "../../models/meeting.model.js";
import Class from "../../models/class.model.js";
import { Notification } from "../../models/notification.model.js";
import { getIO } from "../../config/socket.js";
import {
    MEETING_STATUS,
    NOTIFICATION_TYPES,
    ROLES,
    SOCKET_EVENTS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
} from "../../utils/constants.js";
import { successResponse } from "../../utils/response.js";
import { generateChannelName } from "../../services/agora.service.js";

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

    // Generate Agora channel name for meeting
    const channelName = generateChannelName("meeting", `mtg-${Date.now()}`);

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
        agoraChannel: {
            channelName,
        },
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

