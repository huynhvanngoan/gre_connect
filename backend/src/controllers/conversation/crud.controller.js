import asyncHandler from "express-async-handler";
import { Conversation } from "../../models/conversation.model.js";
import Message from "../../models/message.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Get all conversations for authenticated user
 * @route   GET /api/v1/conversations
 * @access  Private
 */
export const getUserConversations = asyncHandler(async (req, res) => {
    const { type, limit = 50, skip = 0, includeArchived = false } = req.query;
    const userId = req.user._id;

    const query = {
        "participants.user": userId,
        "participants.status": "active",
        isActive: true,
    };

    if (type) {
        query.type = type;
    }

    // Find conversations with lean() for better performance
    let conversations = await Conversation.find(query)
        .populate("participants.user", "firstName lastName username profilePicture role isOnline lastSeen")
        .populate({ path: "lastMessage", select: "content type createdAt media" })
        .populate("createdBy", "firstName lastName username")
        .populate("classId", "name code coverImage")
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();

    // Filter out archived conversations if needed
    let filteredConversations = conversations;
    if (!includeArchived) {
        filteredConversations = conversations.filter(conv => {
            const participant = conv.participants.find(p =>
                (p.user?._id?.toString() || p.user?.toString()) === userId.toString()
            );
            return participant && !participant.isArchived;
        });
    }

    // Batch query: Get unread counts for all conversations at once
    const conversationIds = filteredConversations.map(conv => conv._id);

    // Get all participants with lastSeenAt for batch unread count calculation
    const participantMap = new Map();
    filteredConversations.forEach(conv => {
        const participant = conv.participants.find(p =>
            (p.user?._id?.toString() || p.user?.toString()) === userId.toString()
        );
        if (participant) {
            participantMap.set(conv._id.toString(), participant.lastSeenAt);
        }
    });

    // Batch calculate unread counts
    const unreadCountMap = new Map();
    const conversationsWithLastSeen = [];
    const conversationsWithoutLastSeen = [];

    conversationIds.forEach(convId => {
        const convIdStr = convId.toString();
        const lastSeenAt = participantMap.get(convIdStr);
        if (lastSeenAt) {
            conversationsWithLastSeen.push({ convId, lastSeenAt });
        } else {
            conversationsWithoutLastSeen.push(convId);
        }
        unreadCountMap.set(convIdStr, 0);
    });

    // Batch 1: Count unread for conversations with lastSeenAt
    if (conversationsWithLastSeen.length > 0) {
        const lastSeenConvIds = conversationsWithLastSeen.map(c => c.convId);
        const unreadCountsWithLastSeen = await Message.aggregate([
            {
                $match: {
                    conversation: { $in: lastSeenConvIds },
                    sender: { $ne: userId },
                }
            },
            {
                $group: {
                    _id: "$conversation",
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $gt: ["$createdAt", new Date(conversationsWithLastSeen.find(c => c.convId.equals("$_id"))?.lastSeenAt || 0)]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        unreadCountsWithLastSeen.forEach(result => {
            unreadCountMap.set(result._id.toString(), result.unreadCount);
        });
    }

    // Batch 2: Count all messages for conversations without lastSeenAt
    if (conversationsWithoutLastSeen.length > 0) {
        const unreadCountsWithoutLastSeen = await Message.aggregate([
            {
                $match: {
                    conversation: { $in: conversationsWithoutLastSeen },
                    sender: { $ne: userId },
                }
            },
            {
                $group: {
                    _id: "$conversation",
                    unreadCount: { $sum: 1 }
                }
            }
        ]);

        unreadCountsWithoutLastSeen.forEach(result => {
            unreadCountMap.set(result._id.toString(), result.unreadCount);
        });
    }

    // Get latest messages for all conversations in one query
    const latestMessages = await Message.find({
        conversation: { $in: conversationIds }
    })
        .sort({ createdAt: -1 })
        .select("conversation content type createdAt media")
        .lean();

    // Create a map of latest messages by conversation ID
    const latestMessageMap = new Map();
    latestMessages.forEach(msg => {
        const convId = msg.conversation.toString();
        if (!latestMessageMap.has(convId)) {
            latestMessageMap.set(convId, msg);
        }
    });

    // Add unread counts and latest messages to conversations
    const conversationsWithData = filteredConversations.map(conv => {
        const convIdStr = conv._id.toString();
        return {
            ...conv,
            unreadCount: unreadCountMap.get(convIdStr) || 0,
            lastMessage: latestMessageMap.get(convIdStr) || conv.lastMessage,
        };
    });

    successResponse(res, HTTP_STATUS.OK, "Conversations retrieved successfully", {
        conversations: conversationsWithData,
        total: filteredConversations.length,
    });
});

/**
 * @desc    Get conversation by ID
 * @route   GET /api/v1/conversations/:conversationId
 * @access  Private
 */
export const getConversationById = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    const conversation = await findOr404(Conversation, conversationId, "Conversation not found");

    await conversation.populate("participants.user", "firstName lastName username profilePicture role isOnline lastSeen");
    await conversation.populate("lastMessage");
    await conversation.populate("createdBy", "firstName lastName username");
    await conversation.populate("classId", "name code coverImage");
    await conversation.populate({
        path: "pinnedMessages.message",
        populate: {
            path: "sender",
            select: "firstName lastName username profilePicture"
        }
    });

    // Check if user is participant
    if (!conversation.isParticipant(req.user._id)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You are not a participant in this conversation");
    }

    // Get unread count
    const unreadCount = await conversation.getUnreadCount(req.user._id);

    successResponse(res, HTTP_STATUS.OK, "Conversation retrieved successfully", {
        conversation: {
            ...conversation.toObject(),
            unreadCount,
        },
    });
});

