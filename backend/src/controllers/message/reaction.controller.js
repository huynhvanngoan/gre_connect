import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Add or update reaction to a message
 * @route   POST /api/messages/:messageId/react
 * @access  Private
 */
export const reactToMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await findOr404(Message, messageId, "Message not found");

    // Check if user is participant
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    await message.addReaction(userId, emoji);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-reaction", {
        messageId: message._id,
        userId,
        emoji,
    });

    successResponse(res, HTTP_STATUS.OK, "Reaction added", {
        reactions: message.reactions,
    });
});

/**
 * @desc    Remove reaction from a message
 * @route   DELETE /api/messages/:messageId/react
 * @access  Private
 */
export const removeReaction = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await findOr404(Message, messageId, "Message not found");

    await message.removeReaction(userId);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-reaction-removed", {
        messageId: message._id,
        userId,
    });

    successResponse(res, HTTP_STATUS.OK, "Reaction removed");
});

