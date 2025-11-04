import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Mark message as read
 * @route   POST /api/messages/:messageId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await findOr404(Message, messageId, "Message not found");

    await message.markAsRead(userId);

    // Update conversation lastReadAt
    const conversation = await Conversation.findById(message.conversation);
    await conversation.markAsRead(userId);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-read", {
        messageId: message._id,
        userId,
        readAt: new Date(),
    });

    successResponse(res, HTTP_STATUS.OK, "Message marked as read");
});

/**
 * @desc    Mark all messages in conversation as read
 * @route   POST /api/messages/:conversationId/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    if (!conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    const count = await Message.markAllAsRead(conversationId, userId);
    await conversation.markAsRead(userId);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("messages-read-all", {
        userId,
        conversationId,
    });

    successResponse(res, HTTP_STATUS.OK, "All messages marked as read", { count });
});

/**
 * @desc    Get unread message count for a conversation
 * @route   GET /api/messages/:conversationId/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    if (!conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    const count = await conversation.getUnreadCount(userId);

    successResponse(res, HTTP_STATUS.OK, "Unread count retrieved successfully", { count });
});

