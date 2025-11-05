import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";

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
    if (typeof conversation.canPost === 'function') {
        if (!conversation.canPost(userId)) {
            res.status(HTTP_STATUS.FORBIDDEN);
            throw new Error("Only admins can post in this conversation");
        }
    } else {
        // Fallback: allow posting if not restricted by schema
        if (conversation.onlyAdminsCanPost) {
            const participant = conversation.participants?.find((p) => p.user?.toString() === userId.toString());
            const role = participant?.role || 'member';
            if (role !== 'admin' && role !== 'owner') {
                res.status(HTTP_STATUS.FORBIDDEN);
                throw new Error("Only admins can post in this conversation");
            }
        }
    }

    // Prepare message data
    const messageData = {
        conversation: conversationId,
        sender: userId,
        type: messageType || MESSAGE_TYPES.TEXT,
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

    // Handle media from uploaded files
    if (req.files && req.files.length > 0) {
        messageData.media = req.files.map(file => ({
            type: file.mimetype.startsWith("image/") ? MESSAGE_TYPES.IMAGE :
                file.mimetype.startsWith("video/") ? MESSAGE_TYPES.VIDEO :
                    file.mimetype.startsWith("audio/") ? MESSAGE_TYPES.AUDIO : MESSAGE_TYPES.FILE,
            url: file.path,
            filename: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            publicId: file.publicId,
        }));

        // If there's media and no explicit messageType, infer a generic FILE/IMAGE etc for the message type
        if (!messageType && messageData.media.length > 0) {
            const primaryType = messageData.media[0].type;
            messageData.type = primaryType;
        }
    }

    // Create message
    const message = await Message.create(messageData);

    // Populate sender
    await message.populate("sender", "firstName lastName username profilePicture role");

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    // Send notifications to mentioned users
    if (mentions && mentions.length > 0) {
        for (const mentionId of mentions) {
            await Notification.createNotification({
                recipientId: mentionId,
                senderId: userId,
                type: NOTIFICATION_TYPES.MESSAGE_MENTION,
                title: "You were mentioned",
                message: `${req.user.fullName} mentioned you in a message`,
                metadata: { conversationId, messageId: message._id },
            });
        }
    }

    // Emit socket event to all participants
    const io = getIO();
    conversation.participants.forEach(participant => {
        io.to(participant.user.toString()).emit("new-message", message);
    });

    successResponse(res, HTTP_STATUS.CREATED, "Message sent successfully", { message });
});

/**
 * @desc    Get messages in a conversation
 * @route   GET /api/messages/:conversationId
 * @access  Private
 */
export const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { limit = 50, before, after } = req.query;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Conversation not found");
    }

    // Check if user is participant
    if (!conversation.isParticipant(req.user._id)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You are not a participant in this conversation");
    }

    // Build query
    const query = { conversation: conversationId };

    if (before) {
        query.createdAt = { $lt: new Date(before) };
    }
    if (after) {
        query.createdAt = { $gt: new Date(after) };
    }

    // Get messages using model method if available
    const messages = typeof Message.findByConversation === 'function'
        ? await Message.findByConversation(conversationId, req.user._id, {
            limit: parseInt(limit),
            before: before ? new Date(before) : null,
        })
        : await Message.find(query)
            .populate("sender", "firstName lastName username profilePicture role")
            .populate("replyTo", "content sender type")
            .populate("replyTo.sender", "firstName lastName username profilePicture")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .then(msgs => msgs.reverse());

    // Get unread count
    const unreadCount = await conversation.getUnreadCount(req.user._id);

    successResponse(res, HTTP_STATUS.OK, "Messages retrieved successfully", {
        messages,
        hasMore: messages.length === parseInt(limit),
        unreadCount,
    });
});

/**
 * @desc    Get single message by ID
 * @route   GET /api/messages/:messageId
 * @access  Private
 */
export const getMessageById = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

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
    if (message.deletedFor && message.deletedFor.includes(req.user._id)) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Message not found");
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.isParticipant(req.user._id)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Access denied");
    }

    successResponse(res, HTTP_STATUS.OK, "Message retrieved successfully", { message });
});

