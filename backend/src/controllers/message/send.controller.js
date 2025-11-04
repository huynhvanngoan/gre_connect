import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { Notification } from "../../models/notification.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
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

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    // Check if user is participant
    if (!conversation.isParticipant(userId)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You are not a participant in this conversation");
    }

    // Check if user can post (for groups with onlyAdminsCanPost)
    if (typeof conversation.canPost === 'function') {
        if (!conversation.canPost(userId)) {
            return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can post in this conversation");
        }
    } else {
        // Fallback: allow posting if not restricted by schema
        if (conversation.onlyAdminsCanPost) {
            const participant = conversation.participants?.find((p) => p.user?.toString() === userId.toString());
            const role = participant?.role || 'member';
            if (role !== 'admin' && role !== 'owner') {
                return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only admins can post in this conversation");
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

    // Update conversation's lastMessage
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Notify participants (except sender)
    const participants = conversation.participants.filter(p => !p.user.equals(userId));
    for (const participant of participants) {
        // Check if user is muted
        const isMuted = participant.isMuted || false;
        if (!isMuted) {
            await Notification.createNotification({
                recipientId: participant.user,
                senderId: userId,
                type: NOTIFICATION_TYPES.MESSAGE,
                title: "New Message",
                message: content || "Sent a media file",
                actionUrl: `/messages/${conversationId}`,
                conversationId: conversationId,
            });
        }
    }

    // Emit socket event to all participants
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("new-message", message);

    successResponse(res, HTTP_STATUS.CREATED, "Message sent successfully", { message });
});

