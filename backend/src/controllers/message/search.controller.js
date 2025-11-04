import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Forward a message to another conversation
 * @route   POST /api/messages/:messageId/forward
 * @access  Private
 */
export const forwardMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { conversationId } = req.body;
    const userId = req.user._id;

    const message = await findOr404(Message, messageId, "Message not found");

    // Check target conversation
    const targetConversation = await findOr404(Conversation, conversationId, "Target conversation not found");

    if (!targetConversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You are not a participant in target conversation");
    }

    // Forward message
    const forwardedMessage = await message.forwardTo(conversationId, userId);

    await forwardedMessage.populate("sender", "firstName lastName username profilePicture role");

    // Emit socket event
    const { getIO } = await import("../../config/socket.js");
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("new-message", forwardedMessage);

    successResponse(res, HTTP_STATUS.CREATED, "Message forwarded successfully", {
        message: forwardedMessage,
    });
});

/**
 * @desc    Search messages in a conversation
 * @route   GET /api/messages/:conversationId/search
 * @access  Private
 */
export const searchMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { q } = req.query;
    const userId = req.user._id;

    if (!q) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Search query is required");
    }

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    if (!conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    const messages = await Message.searchMessages(conversationId, q, userId);

    successResponse(res, HTTP_STATUS.OK, "Search results", {
        messages,
        count: messages.length,
    });
});

/**
 * @desc    Get media messages (images, videos, files) in a conversation
 * @route   GET /api/messages/:conversationId/media
 * @access  Private
 */
export const getMediaMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { type } = req.query; // image, video, audio, file
    const userId = req.user._id;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    if (!conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    const messages = await Message.getMediaMessages(conversationId, userId, type);

    successResponse(res, HTTP_STATUS.OK, "Media messages retrieved", {
        messages,
        count: messages.length,
    });
});

