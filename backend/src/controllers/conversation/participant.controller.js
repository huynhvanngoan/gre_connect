import asyncHandler from "express-async-handler";
import { Conversation } from "../../models/conversation.model.js";
import User from "../../models/user.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Add participant to conversation
 * @route   POST /api/v1/conversations/:conversationId/participants
 * @access  Private
 */
export const addParticipant = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { userId, role = "member" } = req.body;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Check permissions
    if (!conversation.settings?.allowMemberInvites && !conversation.isAdmin(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can add participants");
    }

    // Check if user exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    // Check if user is already a participant
    if (conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "User is already a participant");
    }

    // Add participant
    await conversation.addParticipant(userId, req.user, role);

    // Populate updated conversation
    await conversation.populate("participants.user", "firstName lastName username profilePicture role");

    // Emit socket event
    const io = getIO();
    io.to(userId).emit("added-to-conversation", conversation);
    io.to(`conversation-${conversationId}`).emit("participant-added", {
        conversationId,
        user: userToAdd,
    });

    successResponse(res, HTTP_STATUS.OK, "Participant added successfully", {
        conversation,
    });
});

/**
 * @desc    Remove participant from conversation
 * @route   DELETE /api/v1/conversations/:conversationId/participants/:userId
 * @access  Private
 */
export const removeParticipant = asyncHandler(async (req, res) => {
    const { conversationId, userId } = req.params;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Check if user is admin
    if (!conversation.isAdmin(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can remove participants");
    }

    // Can't remove yourself this way
    if (userId === req.user._id.toString()) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Use leave endpoint to leave the conversation");
    }

    // Remove participant
    await conversation.removeParticipant(userId, req.user);

    // Emit socket event
    const io = getIO();
    io.to(userId).emit("removed-from-conversation", {
        conversationId,
    });
    io.to(`conversation-${conversationId}`).emit("participant-removed", {
        conversationId,
        userId,
    });

    successResponse(res, HTTP_STATUS.OK, "Participant removed successfully");
});

/**
 * @desc    Leave conversation
 * @route   POST /api/v1/conversations/:conversationId/leave
 * @access  Private
 */
export const leaveConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Can't leave direct conversations
    if (conversation.type === CONVERSATION_TYPES.DIRECT) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot leave direct conversations");
    }

    // Can't leave class conversations
    if (conversation.type === CONVERSATION_TYPES.CLASS) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot leave class conversations");
    }

    // Leave conversation
    await conversation.leaveConversation(req.user._id);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("participant-left", {
        conversationId,
        userId: req.user._id,
    });

    successResponse(res, HTTP_STATUS.OK, "Left conversation successfully");
});

/**
 * @desc    Update participant role
 * @route   PUT /api/v1/conversations/:conversationId/participants/:userId/role
 * @access  Private
 */
export const updateParticipantRole = asyncHandler(async (req, res) => {
    const { conversationId, userId } = req.params;
    const { role } = req.body;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Check if user is admin
    if (!conversation.isAdmin(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can update participant roles");
    }

    // Update role
    await conversation.updateParticipantRole(userId, role, req.user);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("participant-role-updated", {
        conversationId,
        userId,
        role,
    });

    successResponse(res, HTTP_STATUS.OK, "Participant role updated successfully");
});

/**
 * @desc    Get conversation participants
 * @route   GET /api/v1/conversations/:conversationId/participants
 * @access  Private
 */
export const getParticipants = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
        .populate("participants.user", "firstName lastName username profilePicture role isOnline lastSeen");

    if (!conversation) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Conversation not found");
    }

    if (!conversation.isParticipant(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You are not a participant in this conversation");
    }

    const activeParticipants = conversation.participants.filter(p => p.status === "active");

    successResponse(res, HTTP_STATUS.OK, "Participants retrieved successfully", {
        participants: activeParticipants,
        total: activeParticipants.length,
    });
});

