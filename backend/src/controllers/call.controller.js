import asyncHandler from "express-async-handler";
import { Call } from "../models/call.model.js";
import {Conversation} from "../models/conversation.model.js";
import User from "../models/user.model.js";
import {Notification} from "../models/notification.model.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { HTTP_STATUS, CALL_TYPES, CALL_STATUS, NOTIFICATION_TYPES } from "../utils/constants.js";
import { getIO } from "../config/socket.js";

// ============================================
// INITIATE CALL
// ============================================

/**
 * @desc    Initiate a new call (voice or video)
 * @route   POST /api/v1/calls/initiate
 * @access  Private
 */
export const initiateCall = asyncHandler(async (req, res) => {
    const { recipientId, conversationId, callType, isVideoEnabled = true, isAudioEnabled = true } = req.body;
    const userId = req.user._id;

    // Validate: must have either recipientId or conversationId
    if (!recipientId && !conversationId) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Either recipientId or conversationId is required");
    }

    let conversation;
    let participants = [userId];

    // Handle direct call
    if (recipientId) {
        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            res.status(HTTP_STATUS.NOT_FOUND);
            throw new Error("Recipient not found");
        }

        // Find or create conversation
        conversation = await Conversation.findOrCreateDirectConversation(userId, recipientId);
        participants.push(recipientId);
    } else {
        // Handle group/class call
        conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            res.status(HTTP_STATUS.NOT_FOUND);
            throw new Error("Conversation not found");
        }

        // Check if user is participant
        if (!conversation.isParticipant(userId)) {
            res.status(HTTP_STATUS.FORBIDDEN);
            throw new Error("You are not a participant in this conversation");
        }

        // Check if calls are allowed
        if (!conversation.settings.allowCalls) {
            res.status(HTTP_STATUS.FORBIDDEN);
            throw new Error("Calls are not allowed in this conversation");
        }

        // Add all conversation participants
        participants = conversation.participants.map(p => p.user);
    }

    // Create call
    const call = await Call.create({
        caller: userId,
        conversation: conversation._id,
        callType,
        participants: participants.map(id => ({
            user: id,
            status: id.equals(userId) ? "connected" : "ringing",
            joinedAt: id.equals(userId) ? new Date() : null,
        })),
        status: CALL_STATUS.RINGING,
        isVideoEnabled,
        isAudioEnabled,
    });

    await call.populate("caller", "firstName lastName username profilePicture");
    await call.populate("participants.user", "firstName lastName username profilePicture");

    // Notify all participants via Socket.IO
    const io = getIO();
    participants.forEach(participantId => {
        if (!participantId.equals(userId)) {
            io.to(participantId.toString()).emit("incoming-call", {
                call: {
                    _id: call._id,
                    caller: call.caller,
                    callType: call.callType,
                    conversationId: conversation._id,
                },
            });

            // Create notification
            Notification.createNotification({
                recipientId: participantId,
                senderId: userId,
                type: NOTIFICATION_TYPES.CALL_INCOMING,
                title: "Incoming Call",
                message: `${req.user.fullName} is calling you`,
                actionUrl: `/calls/${call._id}`,
                channels: { inApp: true, push: true },
            });
        }
    });

    successResponse(res, HTTP_STATUS.CREATED, "Call initiated successfully", { call });
});

// ============================================
// JOIN CALL
// ============================================

/**
 * @desc    Join an ongoing call
 * @route   POST /api/v1/calls/:callId/join
 * @access  Private
 */
export const joinCall = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const { isVideoEnabled = true, isAudioEnabled = true } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId)
        .populate("caller", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture");

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Check if user is a participant
    const participant = call.participants.find(p => p.user._id.equals(userId));
    if (!participant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not invited to this call");
    }

    // Check call status
    if (call.status === CALL_STATUS.ENDED) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("This call has ended");
    }

    // Update participant status
    await call.joinParticipant(userId, isVideoEnabled, isAudioEnabled);

    // Notify other participants
    const io = getIO();
    call.participants.forEach(p => {
        if (!p.user._id.equals(userId)) {
            io.to(p.user._id.toString()).emit("user-joined-call", {
                callId: call._id,
                user: {
                    _id: req.user._id,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName,
                    username: req.user.username,
                    profilePicture: req.user.profilePicture,
                },
                isVideoEnabled,
                isAudioEnabled,
            });
        }
    });

    successResponse(res, HTTP_STATUS.OK, "Joined call successfully", { call });
});

// ============================================
// LEAVE CALL
// ============================================

/**
 * @desc    Leave a call
 * @route   POST /api/v1/calls/:callId/leave
 * @access  Private
 */
export const leaveCall = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId);

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Update participant status
    await call.leaveParticipant(userId);

    // Check if call should end (all left or only caller remaining)
    const activeParticipants = call.participants.filter(p =>
        p.status === "connected" || p.status === "ringing"
    );

    if (activeParticipants.length <= 1) {
        await call.endCall();
    }

    // Notify other participants
    const io = getIO();
    call.participants.forEach(p => {
        if (!p.user.equals(userId)) {
            io.to(p.user.toString()).emit("user-left-call", {
                callId: call._id,
                userId,
            });
        }
    });

    successResponse(res, HTTP_STATUS.OK, "Left call successfully");
});

// ============================================
// END CALL
// ============================================

/**
 * @desc    End a call (host only)
 * @route   POST /api/v1/calls/:callId/end
 * @access  Private
 */
export const endCall = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId);

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Check if user is the caller
    if (!call.caller.equals(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Only the caller can end the call");
    }

    // End call
    await call.endCall();

    // Notify all participants
    const io = getIO();
    call.participants.forEach(p => {
        io.to(p.user.toString()).emit("call-ended", {
            callId: call._id,
        });
    });

    successResponse(res, HTTP_STATUS.OK, "Call ended successfully");
});

// ============================================
// DECLINE CALL
// ============================================

/**
 * @desc    Decline an incoming call
 * @route   POST /api/v1/calls/:callId/decline
 * @access  Private
 */
export const declineCall = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId)
        .populate("caller", "firstName lastName username profilePicture");

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Check if user is a participant
    const participant = call.participants.find(p => p.user.equals(userId));
    if (!participant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not invited to this call");
    }

    // Check call status - can only decline ringing calls
    if (call.status !== CALL_STATUS.RINGING) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Can only decline incoming calls");
    }

    // Update participant status to declined
    participant.status = "declined";
    participant.leftAt = new Date();

    // Update call status to declined
    call.status = CALL_STATUS.DECLINED;
    await call.save();

    // Notify the caller
    const io = getIO();
    io.to(call.caller._id.toString()).emit("call-declined", {
        callId: call._id,
        declinedBy: {
            _id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            username: req.user.username,
            profilePicture: req.user.profilePicture,
        },
    });

    // Create notification for caller
    await Notification.createNotification({
        recipientId: call.caller._id,
        senderId: userId,
        type: NOTIFICATION_TYPES.CALL_MISSED,
        title: "Call Declined",
        message: `${req.user.fullName} declined your call`,
        actionUrl: `/calls/${call._id}`,
        channels: { inApp: true, push: false },
    });

    successResponse(res, HTTP_STATUS.OK, "Call declined successfully");
});

// ============================================
// TOGGLE AUDIO
// ============================================

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

    participant.isAudioEnabled = enabled;
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

// ============================================
// TOGGLE VIDEO
// ============================================

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

    participant.isVideoEnabled = enabled;
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

// ============================================
// GET ACTIVE CALL
// ============================================

/**
 * @desc    Get active call for current user
 * @route   GET /api/v1/calls/active
 * @access  Private
 */
export const getActiveCall = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const call = await Call.findOne({
        "participants.user": userId,
        status: { $in: [CALL_STATUS.RINGING, CALL_STATUS.ONGOING] },
    })
        .populate("caller", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture")
        .sort({ createdAt: -1 });

    if (!call) {
        return successResponse(res, HTTP_STATUS.OK, "No active call", { call: null });
    }

    successResponse(res, HTTP_STATUS.OK, "Active call retrieved", { call });
});

// ============================================
// GET CALL HISTORY
// ============================================

/**
 * @desc    Get call history for current user
 * @route   GET /api/v1/calls/history
 * @access  Private
 */
export const getCallHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { limit = 50, page = 1, callType, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {
        "participants.user": userId,
    };

    if (callType) {
        query.callType = callType;
    }

    if (status) {
        query.status = status;
    }

    const calls = await Call.find(query)
        .populate("caller", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean();

    const total = await Call.countDocuments(query);

    // Add call direction (incoming/outgoing) for each call
    const callsWithDirection = calls.map(call => ({
        ...call,
        direction: call.caller._id.toString() === userId.toString() ? "outgoing" : "incoming",
    }));

    successResponse(res, HTTP_STATUS.OK, "Call history retrieved", {
        calls: callsWithDirection,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

// ============================================
// GET CALL BY ID
// ============================================

/**
 * @desc    Get call details by ID
 * @route   GET /api/v1/calls/:callId
 * @access  Private
 */
export const getCallById = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId)
        .populate("caller", "firstName lastName username profilePicture")
        .populate("participants.user", "firstName lastName username profilePicture");

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Check if user is a participant
    const isParticipant = call.participants.some(p => p.user._id.equals(userId));
    if (!isParticipant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view this call");
    }

    successResponse(res, HTTP_STATUS.OK, "Call retrieved", { call });
});

// ============================================
// WEBRTC SIGNALING
// ============================================

/**
 * @desc    Handle WebRTC signaling (offer, answer, ICE candidates)
 * @route   POST /api/v1/calls/:callId/signal
 * @access  Private
 */
export const handleSignaling = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const { type, data, targetUserId } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Check if user is a participant
    const isParticipant = call.participants.some(p => p.user.equals(userId));
    if (!isParticipant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not in this call");
    }

    // Forward signal to target user or all participants
    const io = getIO();

    if (targetUserId) {
        // Send to specific user (for peer-to-peer)
        io.to(targetUserId.toString()).emit("webrtc-signal", {
            callId,
            from: userId,
            type,
            data,
        });
    } else {
        // Broadcast to all participants except sender
        call.participants.forEach(p => {
            if (!p.user.equals(userId)) {
                io.to(p.user.toString()).emit("webrtc-signal", {
                    callId,
                    from: userId,
                    type,
                    data,
                });
            }
        });
    }

    successResponse(res, HTTP_STATUS.OK, "Signal sent successfully");
});

// ============================================
// RATE CALL
// ============================================

/**
 * @desc    Rate a completed call
 * @route   POST /api/v1/calls/:callId/rate
 * @access  Private
 */
export const rateCall = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);

    if (!call) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Call not found");
    }

    // Check if user is a participant
    const participant = call.participants.find(p => p.user.equals(userId));
    if (!participant) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not a participant in this call");
    }

    // Check if call has ended
    if (call.status !== CALL_STATUS.ENDED) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Can only rate completed calls");
    }

    // Check if already rated
    if (call.ratings.some(r => r.user.equals(userId))) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("You have already rated this call");
    }

    // Add rating
    call.ratings.push({
        user: userId,
        rating,
        feedback: feedback || "",
    });

    await call.save();

    successResponse(res, HTTP_STATUS.OK, "Call rated successfully", {
        averageRating: call.averageRating,
        totalRatings: call.ratings.length
    });
});

// ============================================
// EXPORTS
// ============================================

export default {
    initiateCall,
    joinCall,
    leaveCall,
    endCall,
    declineCall,
    toggleAudio,
    toggleVideo,
    getActiveCall,
    getCallHistory,
    getCallById,
    handleSignaling,
    rateCall,
};