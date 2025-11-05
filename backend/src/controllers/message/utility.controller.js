import asyncHandler from "express-async-handler";
import Message from "../../models/message.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Search messages in conversation
 * @route   GET /api/messages/:conversationId/search
 * @access  Private
 */
export const searchMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { q, limit = 50 } = req.query;

    if (!q || q.trim().length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Search query is required");
    }

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

    // Search messages using model method if available
    const messages = typeof Message.searchMessages === 'function'
        ? await Message.searchMessages(conversationId, q, req.user._id)
        : await Message.find({
            conversation: conversationId,
            content: new RegExp(q, "i"),
            isDeleted: false,
        })
            .populate("sender", "firstName lastName username profilePicture")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

    successResponse(res, HTTP_STATUS.OK, "Search results", {
        messages,
        count: messages.length,
    });
});

/**
 * @desc    Get media messages in a conversation
 * @route   GET /api/messages/:conversationId/media
 * @access  Private
 */
export const getMediaMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

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

    // Get media messages using model method if available
    const { type } = req.query; // image, video, audio, file
    const messages = typeof Message.getMediaMessages === 'function'
        ? await Message.getMediaMessages(conversationId, req.user._id, type)
        : await Message.find({
            conversation: conversationId,
            media: { $exists: true, $ne: [] },
            isDeleted: false,
        })
            .populate("sender", "firstName lastName username profilePicture")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

    successResponse(res, HTTP_STATUS.OK, "Media messages retrieved", {
        messages,
        count: messages.length,
    });
});

/**
 * @desc    Get unread message count for a conversation
 * @route   GET /api/messages/:conversationId/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

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

    const count = await conversation.getUnreadCount(req.user._id);

    successResponse(res, HTTP_STATUS.OK, "Unread count retrieved", { count });
});

