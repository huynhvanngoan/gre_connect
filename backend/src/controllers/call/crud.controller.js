import asyncHandler from "express-async-handler";
import { Call } from "../../models/call.model.js";
import { Conversation } from "../../models/conversation.model.js";
import User from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, CALL_TYPES, CALL_STATUS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";
import { generateRtcToken, generateChannelName, getAgoraAppId } from "../../services/agora.service.js";

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

    // Generate Agora channel name
    const channelName = generateChannelName("call", `conv-${conversation._id}-${Date.now()}`);

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
        agoraChannel: {
            channelName,
        },
    });

    // Generate Agora token for caller
    try {
        const token = generateRtcToken(channelName, userId.toString(), 3600, 'publisher');
        const tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

        call.agoraChannel.token = token;
        call.agoraChannel.tokenExpiresAt = tokenExpiresAt;
        await call.save();
    } catch (error) {
        // Log error but don't fail the call creation
        console.error("Failed to generate Agora token:", error.message);
    }

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

    successResponse(res, HTTP_STATUS.CREATED, "Call initiated successfully", {
        call,
        agora: {
            appId: getAgoraAppId(),
            channelName: call.agoraChannel?.channelName,
            token: call.agoraChannel?.token,
        },
    });
});

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
    await call.joinCall(userId, {
        video: isVideoEnabled,
        audio: isAudioEnabled,
    });

    // Generate or refresh Agora token for joining user
    let agoraToken = null;
    try {
        if (call.agoraChannel?.channelName) {
            agoraToken = generateRtcToken(
                call.agoraChannel.channelName,
                userId.toString(),
                3600,
                'publisher'
            );
        }
    } catch (error) {
        console.error("Failed to generate Agora token for join:", error.message);
    }

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

    successResponse(res, HTTP_STATUS.OK, "Joined call successfully", {
        call,
        agora: {
            appId: getAgoraAppId(),
            channelName: call.agoraChannel?.channelName,
            token: agoraToken,
        },
    });
});

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
    await call.leaveCall(userId);

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

