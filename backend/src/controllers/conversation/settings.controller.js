import asyncHandler from "express-async-handler";
import { Conversation } from "../../models/conversation.model.js";
import Message from "../../models/message.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, CONVERSATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Update conversation details
 * @route   PUT /api/v1/conversations/:conversationId
 * @access  Private
 */
export const updateConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { name, description, avatar } = req.body;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Check if user is admin
    if (!conversation.isAdmin(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can update conversation details");
    }

    // Update fields
    if (name) conversation.name = name;
    if (description !== undefined) conversation.description = description;
    if (avatar) conversation.avatar = avatar;

    await conversation.save();

    // Create system messages for specific changes
    if (name) {
        await conversation.createSystemMessage(
            `${req.user.fullName} changed the group name to "${name}"`,
            "name_changed",
            {
                changedBy: req.user._id,
                newName: name,
            }
        );
    }

    if (avatar) {
        await conversation.createSystemMessage(
            `${req.user.fullName} changed the group photo`,
            "avatar_changed",
            {
                changedBy: req.user._id,
            }
        );
    }

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("conversation-updated", conversation);

    successResponse(res, HTTP_STATUS.OK, "Conversation updated successfully", {
        conversation,
    });
});

/**
 * @desc    Delete conversation
 * @route   DELETE /api/v1/conversations/:conversationId
 * @access  Private
 */
export const deleteConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Only admins can delete group conversations
    if (conversation.type === CONVERSATION_TYPES.GROUP && !conversation.isAdmin(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can delete group conversations");
    }

    // Soft delete
    conversation.isActive = false;
    await conversation.save();

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("conversation-deleted", {
        conversationId,
    });

    successResponse(res, HTTP_STATUS.OK, "Conversation deleted successfully");
});

/**
 * @desc    Update conversation settings
 * @route   PUT /api/v1/conversations/:conversationId/settings
 * @access  Private
 */
export const updateSettings = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const settings = req.body;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Check if user is admin
    if (!conversation.isAdmin(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can update settings");
    }

    // Update settings
    conversation.settings = {
        ...conversation.settings,
        ...settings,
    };

    await conversation.save();

    // Create system message
    await conversation.createSystemMessage(
        `${req.user.fullName} updated conversation settings`,
        "settings_changed",
        {
            changedBy: req.user._id,
        }
    );

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("conversation-settings-updated", {
        conversationId,
        settings: conversation.settings,
    });

    successResponse(res, HTTP_STATUS.OK, "Settings updated successfully", {
        settings: conversation.settings,
    });
});

/**
 * @desc    Mute or unmute conversation
 * @route   PUT /api/v1/conversations/:conversationId/mute
 * @access  Private
 */
export const toggleMute = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { duration } = req.body; // duration in milliseconds, null for permanent

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    const participant = conversation.participants.find(p =>
        p.user.equals(req.user._id)
    );

    if (!participant) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You are not a participant in this conversation");
    }

    if (participant.isMuted) {
        // Unmute
        await conversation.unmuteForUser(req.user._id);
    } else {
        // Mute
        await conversation.muteForUser(req.user._id, duration);
    }

    successResponse(res, HTTP_STATUS.OK, `Conversation ${participant.isMuted ? 'unmuted' : 'muted'} successfully`, {
        isMuted: !participant.isMuted,
    });
});

/**
 * @desc    Archive or unarchive conversation
 * @route   PUT /api/v1/conversations/:conversationId/archive
 * @access  Private
 */
export const toggleArchive = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    const participant = conversation.participants.find(p =>
        p.user.equals(req.user._id)
    );

    if (!participant) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You are not a participant in this conversation");
    }

    participant.isArchived = !participant.isArchived;
    await conversation.save();

    successResponse(res, HTTP_STATUS.OK, `Conversation ${participant.isArchived ? 'archived' : 'unarchived'} successfully`, {
        isArchived: participant.isArchived,
    });
});

/**
 * @desc    Mark conversation as read
 * @route   PUT /api/v1/conversations/:conversationId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { messageId } = req.body; // Optional: specific message ID

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    if (!conversation.isParticipant(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You are not a participant in this conversation");
    }

    await conversation.markAsRead(req.user._id, messageId);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("conversation-read", {
        conversationId,
        userId: req.user._id,
    });

    successResponse(res, HTTP_STATUS.OK, "Conversation marked as read");
});

/**
 * @desc    Pin or unpin message
 * @route   PUT /api/v1/conversations/:conversationId/pin/:messageId
 * @access  Private
 */
export const togglePinMessage = asyncHandler(async (req, res) => {
    const { conversationId, messageId } = req.params;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Check if user is admin
    if (!conversation.isAdmin(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can pin messages");
    }

    // Check if message exists and belongs to this conversation
    const message = await Message.findOne({
        _id: messageId,
        conversation: conversationId,
    });

    if (!message) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Message not found");
    }

    // Toggle pin
    const isPinned = conversation.pinnedMessages.some(
        pm => pm.message.toString() === messageId
    );

    if (isPinned) {
        // Unpin
        conversation.pinnedMessages = conversation.pinnedMessages.filter(
            pm => pm.message.toString() !== messageId
        );
    } else {
        // Pin
        conversation.pinnedMessages.push({
            message: messageId,
            pinnedBy: req.user._id,
            pinnedAt: new Date(),
        });
    }

    await conversation.save();

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("message-pin-toggled", {
        conversationId,
        messageId,
        isPinned: !isPinned,
    });

    successResponse(res, HTTP_STATUS.OK, `Message ${isPinned ? 'unpinned' : 'pinned'} successfully`, {
        isPinned: !isPinned,
    });
});

