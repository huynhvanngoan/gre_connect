import asyncHandler from "express-async-handler";
import { Meeting } from "../../models/meeting.model.js";
import { getIO } from "../../config/socket.js";
import {
    SOCKET_EVENTS,
    ERROR_MESSAGES,
} from "../../utils/constants.js";
import { successResponse } from "../../utils/response.js";

/**
 * @desc    Send chat message in meeting
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

    // Check if chat is enabled
    if (!meeting.settings.allowChat) {
        res.status(400);
        throw new Error("Chat is disabled for this meeting");
    }

    // Check if user is participant
    const isParticipant = meeting.participants.some((p) =>
        p.user.equals(req.user._id)
    );

    if (!isParticipant) {
        res.status(403);
        throw new Error("You must be a participant to send messages");
    }

    // Create chat message
    const chatMessage = {
        sender: req.user._id,
        message,
        timestamp: new Date(),
    };

    // Add to meeting chat
    if (!meeting.chatHistory) {
        meeting.chatHistory = [];
    }
    meeting.chatHistory.push(chatMessage);

    // Keep only last 100 messages
    if (meeting.chatHistory.length > 100) {
        meeting.chatHistory = meeting.chatHistory.slice(-100);
    }

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
 * @desc    Get meeting chat messages
 * @route   GET /api/v1/meetings/:meetingId/chat
 * @access  Private
 */
export const getMeetingChats = asyncHandler(async (req, res) => {
    const meeting = await Meeting.findById(req.params.meetingId)
        .populate("chat.user", "firstName lastName username profilePicture");

    if (!meeting) {
        res.status(404);
        throw new Error(ERROR_MESSAGES.MEETING_NOT_FOUND);
    }

    // Check if user is participant
    const isParticipant = meeting.participants.some((p) =>
        p.user.equals(req.user._id)
    );

    if (!isParticipant) {
        res.status(403);
        throw new Error("You must be a participant to view chat");
    }

    successResponse(res, 200, "Chat messages retrieved successfully", meeting.chatHistory || []);
});

