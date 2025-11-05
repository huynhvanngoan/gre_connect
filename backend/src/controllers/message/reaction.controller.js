import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { successResponse } from "../../utils/response.js";
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

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check if user is participant
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.isParticipant(req.user._id)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
    }

    await message.addReaction(req.user._id, emoji);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-reaction", {
        messageId: message._id,
        userId: req.user._id,
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

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check if user is participant
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.isParticipant(req.user._id)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
    }

    // Remove reaction (remove all reactions for this user)
    await message.removeReaction(req.user._id);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-reaction-removed", {
        messageId: message._id,
        userId: req.user._id,
    });

    successResponse(res, HTTP_STATUS.OK, "Reaction removed");
});

