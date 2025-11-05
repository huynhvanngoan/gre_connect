import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Mark message as read
 * @route   POST /api/messages/:messageId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Mark as read using model method if available
    if (typeof message.markAsRead === 'function') {
        await message.markAsRead(req.user._id);
    }

    // Update conversation lastReadAt
    const conversation = await Conversation.findById(message.conversation);
    await conversation.markAsRead(req.user._id);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-read", {
        messageId: message._id,
        userId: req.user._id,
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

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Conversation not found");
    }

    if (!conversation.isParticipant(req.user._id)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
    }

    // Mark all as read using model method if available
    const count = typeof Message.markAllAsRead === 'function'
        ? await Message.markAllAsRead(conversationId, req.user._id)
        : 0;

    await conversation.markAsRead(req.user._id);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("messages-read-all", {
        userId: req.user._id,
        conversationId,
    });

    successResponse(res, HTTP_STATUS.OK, "All messages marked as read", { count });
});

