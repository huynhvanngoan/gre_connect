import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Get messages in a conversation
 * @route   GET /api/messages/:conversationId
 * @access  Private
 */
export const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user._id;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Check if user is participant
    if (!conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You are not a participant in this conversation");
    }

    // Get messages
    const messages = await Message.findByConversation(conversationId, userId, {
        limit: parseInt(limit),
        before: before ? new Date(before) : null,
    });

    // Get unread count
    const unreadCount = await conversation.getUnreadCount(userId);

    successResponse(res, HTTP_STATUS.OK, "Messages retrieved successfully", {
        messages,
        hasMore: messages.length === parseInt(limit),
        unreadCount,
    });
});

/**
 * @desc    Get single message by ID
 * @route   GET /api/messages/message/:messageId
 * @access  Private
 */
export const getMessageById = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
        .populate("sender", "firstName lastName username profilePicture role")
        .populate({
            path: "replyTo",
            populate: {
                path: "sender",
                select: "firstName lastName username profilePicture"
            }
        })
        .populate("mentions", "firstName lastName username profilePicture");

    if (!message) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Message not found");
    }

    // Check if message is deleted for this user
    if (message.deletedFor.includes(userId)) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Message not found");
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Access denied");
    }

    successResponse(res, HTTP_STATUS.OK, "Message retrieved successfully", { message });
});

/**
 * @desc    Edit a message
 * @route   PUT /api/messages/:messageId
 * @access  Private
 */
export const editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await findOr404(Message, messageId, "Message not found");

    // Check if user can edit
    if (!message.canEdit(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You cannot edit this message");
    }

    // Edit message
    await message.editContent(content);

    await message.populate("sender", "firstName lastName username profilePicture role");

    // Emit socket event
    const { getIO } = await import("../../config/socket.js");
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-edited", message);

    successResponse(res, HTTP_STATUS.OK, "Message edited successfully", { message });
});

/**
 * @desc    Delete a message (for everyone or just for me)
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { deleteForEveryone = false } = req.body;
    const userId = req.user._id;

    const message = await findOr404(Message, messageId, "Message not found");

    if (deleteForEveryone) {
        // Check if user can delete for everyone
        if (!message.canDelete(userId, req.user.role)) {
            return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You cannot delete this message for everyone");
        }

        await message.deleteForEveryone(userId);

        // Emit socket event
        const { getIO } = await import("../../config/socket.js");
        const io = getIO();
        io.to(`conversation-${message.conversation}`).emit("message-deleted", {
            messageId: message._id,
            deletedForEveryone: true,
        });

        successResponse(res, HTTP_STATUS.OK, "Message deleted for everyone");
    } else {
        // Delete for current user only
        await message.deleteForUser(userId);

        successResponse(res, HTTP_STATUS.OK, "Message deleted for you");
    }
});

