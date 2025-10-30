import asyncHandler from "express-async-handler";
import Message from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Notification } from "../models/notification.model.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { HTTP_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES } from "../utils/constants.js";
import { getIO } from "../config/socket.js";

// ============================================
// SEND MESSAGE
// ============================================

/**
 * @desc    Send a message in a conversation
 * @route   POST /api/messages/:conversationId
 * @access  Private
 */
export const sendMessage = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { content, messageType, replyTo, mentions, location } = req.body;
    const userId = req.user._id;

    // Check if conversation exists
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Conversation not found");
    }

    // Check if user is participant
    if (!conversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not a participant in this conversation");
    }

    // Check if user can post (for groups with onlyAdminsCanPost)
    if (!conversation.canPost(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Only admins can post in this conversation");
    }

    // Prepare message data
    const messageData = {
        conversation: conversationId,
        sender: userId,
        messageType: messageType || MESSAGE_TYPES.TEXT,
        content: content || "",
        mentions: mentions || [],
    };

    // Handle location message
    if (location) {
        messageData.location = location;
    }

    // Handle reply
    if (replyTo) {
        const replyMessage = await Message.findById(replyTo);
        if (replyMessage && replyMessage.conversation.equals(conversationId)) {
            messageData.replyTo = replyTo;
        }
    }

    // Handle attachments from uploaded files
    if (req.files && req.files.length > 0) {
        messageData.attachments = req.files.map(file => ({
            type: file.mimetype.startsWith("image/") ? "image" :
                file.mimetype.startsWith("video/") ? "video" :
                    file.mimetype.startsWith("audio/") ? "audio" : "file",
            url: file.path,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            publicId: file.publicId,
        }));
    }

    // Create message
    const message = await Message.create(messageData);

    // Populate sender info
    await message.populate("sender", "firstName lastName username profilePicture role");

    if (replyTo) {
        await message.populate({
            path: "replyTo",
            populate: {
                path: "sender",
                select: "firstName lastName username profilePicture"
            }
        });
    }

    // Mark as delivered for all participants
    await message.markAsDelivered();

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("new-message", message);

    // Send real-time notification to other participants
    conversation.participants.forEach(participant => {
        if (!participant.user.equals(userId)) {
            io.to(participant.user.toString()).emit("message-notification", {
                conversationId,
                message,
            });
        }
    });

    successResponse(res, HTTP_STATUS.CREATED, "Message sent successfully", { message });
});

// ============================================
// GET MESSAGES
// ============================================

/**
 * @desc    Get messages in a conversation
 * @route   GET /api/messages/:conversationId
 * @access  Private
 */
export const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user._id;

    // Check if conversation exists
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Conversation not found");
    }

    // Check if user is participant
    if (!conversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not a participant in this conversation");
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

// ============================================
// GET MESSAGE BY ID
// ============================================

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
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check if message is deleted for this user
    if (message.deletedFor.includes(userId)) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
    }

    successResponse(res, HTTP_STATUS.OK, "Message retrieved successfully", { message });
});

// ============================================
// EDIT MESSAGE
// ============================================

/**
 * @desc    Edit a message
 * @route   PUT /api/messages/:messageId
 * @access  Private
 */
export const editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check if user can edit
    if (!message.canEdit(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You cannot edit this message");
    }

    // Edit message
    await message.editContent(content);

    await message.populate("sender", "firstName lastName username profilePicture role");

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-edited", message);

    successResponse(res, HTTP_STATUS.OK, "Message edited successfully", { message });
});

// ============================================
// DELETE MESSAGE
// ============================================

/**
 * @desc    Delete a message (for everyone or just for me)
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { deleteForEveryone = false } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    if (deleteForEveryone) {
        // Check if user can delete for everyone
        if (!message.canDelete(userId, req.user.role)) {
            res.status(HTTP_STATUS.FORBIDDEN);
            throw new Error("You cannot delete this message for everyone");
        }

        await message.deleteForEveryone(userId);

        // Emit socket event
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

// ============================================
// REACT TO MESSAGE
// ============================================

/**
 * @desc    Add or update reaction to a message
 * @route   POST /api/messages/:messageId/react
 * @access  Private
 */
export const reactToMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check if user is participant
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
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

// ============================================
// REMOVE REACTION
// ============================================

/**
 * @desc    Remove reaction from a message
 * @route   DELETE /api/messages/:messageId/react
 * @access  Private
 */
export const removeReaction = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    await message.removeReaction(userId);

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${message.conversation}`).emit("message-reaction-removed", {
        messageId: message._id,
        userId,
    });

    successResponse(res, HTTP_STATUS.OK, "Reaction removed");
});

// ============================================
// MARK AS READ
// ============================================

/**
 * @desc    Mark message as read
 * @route   POST /api/messages/:messageId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

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

// ============================================
// MARK ALL AS READ
// ============================================

/**
 * @desc    Mark all messages in conversation as read
 * @route   POST /api/messages/:conversationId/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Conversation not found");
    }

    if (!conversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
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

// ============================================
// FORWARD MESSAGE
// ============================================

/**
 * @desc    Forward a message to another conversation
 * @route   POST /api/messages/:messageId/forward
 * @access  Private
 */
export const forwardMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { conversationId } = req.body;
    const userId = req.user._id;

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

    if (!targetConversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not a participant in target conversation");
    }

    // Forward message
    const forwardedMessage = await message.forwardTo(conversationId, userId);

    await forwardedMessage.populate("sender", "firstName lastName username profilePicture role");

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("new-message", forwardedMessage);

    successResponse(res, HTTP_STATUS.CREATED, "Message forwarded successfully", {
        message: forwardedMessage,
    });
});

// ============================================
// SEARCH MESSAGES
// ============================================

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
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Search query is required");
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Conversation not found");
    }

    if (!conversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
    }

    const messages = await Message.searchMessages(conversationId, q, userId);

    successResponse(res, HTTP_STATUS.OK, "Search results", {
        messages,
        count: messages.length,
    });
});

// ============================================
// GET MEDIA MESSAGES
// ============================================

/**
 * @desc    Get media messages (images, videos, files) in a conversation
 * @route   GET /api/messages/:conversationId/media
 * @access  Private
 */
export const getMediaMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { type } = req.query; // image, video, audio, file
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Conversation not found");
    }

    if (!conversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
    }

    const messages = await Message.getMediaMessages(conversationId, userId, type);

    successResponse(res, HTTP_STATUS.OK, "Media messages retrieved", {
        messages,
        count: messages.length,
    });
});

// ============================================
// GET UNREAD COUNT
// ============================================

/**
 * @desc    Get unread message count for a conversation
 * @route   GET /api/messages/:conversationId/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Conversation not found");
    }

    if (!conversation.isParticipant(userId)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
    }

    const count = await conversation.getUnreadCount(userId);

    successResponse(res, HTTP_STATUS.OK, "Unread count retrieved", { count });
});

// ============================================
// EXPORTS
// ============================================

export default {
    sendMessage,
    getMessages,
    getMessageById,
    editMessage,
    deleteMessage,
    reactToMessage,
    removeReaction,
    markAsRead,
    markAllAsRead,
    forwardMessage,
    searchMessages,
    getMediaMessages,
    getUnreadCount,
};