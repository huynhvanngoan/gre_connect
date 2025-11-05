import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Edit a message
 * @route   PUT /api/messages/:messageId
 * @access  Private
 */
export const editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check if user can edit (using model method if available)
    if (typeof message.canEdit === 'function') {
        if (!message.canEdit(req.user._id)) {
            res.status(HTTP_STATUS.FORBIDDEN);
            throw new Error("You cannot edit this message");
        }
    } else {
        // Fallback: check if user is sender
        if (!message.sender.equals(req.user._id)) {
            res.status(HTTP_STATUS.FORBIDDEN);
            throw new Error("You can only edit your own messages");
        }
    }

    // Edit message using model method if available
    if (typeof message.editContent === 'function') {
        await message.editContent(content);
    } else {
        // Fallback: manual edit
        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();
    }

    // Populate sender
    await message.populate("sender", "firstName lastName username profilePicture role");

    // Emit socket event
    const io = getIO();
    const conversation = await Conversation.findById(message.conversation);
    conversation.participants.forEach(participant => {
        io.to(participant.user.toString()).emit("message-edited", message);
    });

    successResponse(res, HTTP_STATUS.OK, "Message edited successfully", { message });
});

/**
 * @desc    Delete a message
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { deleteForEveryone = false } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    if (deleteForEveryone) {
        // Check if user can delete for everyone (using model method if available)
        if (typeof message.canDelete === 'function') {
            if (!message.canDelete(req.user._id, req.user.role)) {
                res.status(HTTP_STATUS.FORBIDDEN);
                throw new Error("You cannot delete this message for everyone");
            }
        } else {
            // Fallback: check if user is sender or admin
            const conversation = await Conversation.findById(message.conversation);
            const isSender = message.sender.equals(req.user._id);
            const isAdmin = conversation.isAdmin(req.user._id);
            if (!isSender && !isAdmin) {
                res.status(HTTP_STATUS.FORBIDDEN);
                throw new Error("You don't have permission to delete this message");
            }
        }

        // Delete for everyone using model method if available
        if (typeof message.deleteForEveryone === 'function') {
            await message.deleteForEveryone(req.user._id);
        } else {
            // Fallback: manual delete
            message.isDeleted = true;
            message.deletedAt = new Date();
            message.content = "";
            await message.save();
        }

        // Emit socket event
        const io = getIO();
        const conversation = await Conversation.findById(message.conversation);
        conversation.participants.forEach(participant => {
            io.to(participant.user.toString()).emit("message-deleted", {
                messageId: message._id,
                deletedForEveryone: true,
            });
        });

        successResponse(res, HTTP_STATUS.OK, "Message deleted for everyone");
    } else {
        // Delete for current user only
        if (typeof message.deleteForUser === 'function') {
            await message.deleteForUser(req.user._id);
        } else {
            // Fallback: add to deletedFor array
            if (!message.deletedFor) {
                message.deletedFor = [];
            }
            if (!message.deletedFor.includes(req.user._id)) {
                message.deletedFor.push(req.user._id);
                await message.save();
            }
        }

        successResponse(res, HTTP_STATUS.OK, "Message deleted for you");
    }
});

/**
 * @desc    Forward message to another conversation
 * @route   POST /api/messages/:messageId/forward
 * @access  Private
 */
export const forwardMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { conversationId } = req.body; // Single conversation ID in original

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check target conversation
    const targetConversation = await Conversation.findById(conversationId);

    if (!targetConversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Target conversation not found");
    }

    if (!targetConversation.isParticipant(req.user._id)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not a participant in target conversation");
    }

    // Forward message using model method if available
    let forwardedMessage;
    if (typeof message.forwardTo === 'function') {
        forwardedMessage = await message.forwardTo(conversationId, req.user._id);
    } else {
        // Fallback: manual forward
        forwardedMessage = await Message.create({
            conversation: conversationId,
            sender: req.user._id,
            type: message.type,
            content: message.content,
            media: message.media,
            location: message.location,
            forwardedFrom: message._id,
            forwardedBy: req.user._id,
        });

        // Update conversation
        targetConversation.lastMessage = forwardedMessage._id;
        targetConversation.lastMessageAt = forwardedMessage.createdAt;
        await targetConversation.save();
    }

    await forwardedMessage.populate("sender", "firstName lastName username profilePicture role");

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("new-message", forwardedMessage);

    successResponse(res, HTTP_STATUS.CREATED, "Message forwarded successfully", {
        message: forwardedMessage,
    });
});

