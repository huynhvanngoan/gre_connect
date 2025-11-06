import asyncHandler from "express-async-handler";
import { Conversation } from "../../models/conversation.model.js";
import Message from "../../models/message.model.js";
import User from "../../models/user.model.js";
import { CONVERSATION_TYPES } from "../../utils/constants.js";
import { successResponse } from "../../utils/response.js";
import { getIO } from "../../config/socket.js";

/**
 * @desc    Get all conversations for authenticated user
 * @route   GET /api/v1/conversations
 * @access  Private
 */
export const getUserConversations = asyncHandler(async (req, res) => {
    const { type, limit = 50, skip = 0, includeArchived = false } = req.query;

    const query = {
        "participants.user": req.user._id,
        "participants.status": "active",
        isActive: true,
    };

    if (type) {
        query.type = type;
    }

    // Find participant entry for current user to check archived status
    const conversations = await Conversation.find(query)
        .populate("participants.user", "firstName lastName username profilePicture role isOnline lastSeen")
        .populate({
            path: "lastMessage",
            select: "content type createdAt media metadata",
            populate: {
                path: "sender",
                select: "firstName lastName username profilePicture"
            }
        })
        .populate("createdBy", "firstName lastName username")
        .populate("classId", "name code coverImage")
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

    // Filter out archived conversations if needed
    let filteredConversations = conversations;
    if (!includeArchived) {
        filteredConversations = conversations.filter(conv => {
            const participant = conv.participants.find(p => p.user._id.equals(req.user._id));
            return participant && !participant.isArchived;
        });
    }

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
        filteredConversations.map(async (conv) => {
            try {
                const unreadCount = await conv.getUnreadCount(req.user._id);
                let lastMessage = conv.lastMessage;

                // Ensure lastMessage matches lastMessageAt
                if (!lastMessage || (conv.lastMessageAt && lastMessage.createdAt && new Date(lastMessage.createdAt).getTime() !== new Date(conv.lastMessageAt).getTime())) {
                    try {
                        lastMessage = await Message
                            .findOne({ conversation: conv._id })
                            .sort({ createdAt: -1 })
                            .select("content type createdAt media metadata")
                            .populate("sender", "firstName lastName username profilePicture")
                            .lean();
                    } catch (err) {
                        // If query fails, keep existing lastMessage
                        console.warn("Error fetching lastMessage:", err);
                    }
                }

                const convObj = conv.toObject();
                convObj.lastMessage = lastMessage || convObj.lastMessage;
                if (lastMessage?.createdAt) {
                    convObj.lastMessageAt = lastMessage.createdAt;
                }
                return {
                    ...convObj,
                    unreadCount,
                };
            } catch (err) {
                // If any error occurs, return basic conversation data
                console.error("Error processing conversation:", err);
                const convObj = conv.toObject();
                return {
                    ...convObj,
                    unreadCount: 0,
                    lastMessage: convObj.lastMessage || null,
                };
            }
        })
    );

    successResponse(res, 200, "Conversations retrieved successfully", {
        conversations: conversationsWithUnread,
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

    const conversation = await Conversation.findById(conversationId)
        .populate("participants.user", "firstName lastName username profilePicture role isOnline lastSeen")
        .populate("lastMessage")
        .populate("createdBy", "firstName lastName username")
        .populate("classId", "name code coverImage")
        .populate({
            path: "pinnedMessages.message",
            populate: {
                path: "sender",
                select: "firstName lastName username profilePicture",
            },
        });

    if (!conversation) {
        res.status(404);
        throw new Error("Conversation not found");
    }

    if (!conversation.isParticipant(req.user._id)) {
        res.status(403);
        throw new Error("You are not a participant in this conversation");
    }

    // Get unread count
    const unreadCount = await conversation.getUnreadCount(req.user._id);

    const conversationObj = conversation.toObject();
    conversationObj.unreadCount = unreadCount;

    successResponse(res, 200, "Conversation retrieved successfully", {
        conversation: conversationObj,
    });
});

/**
 * @desc    Create direct conversation
 * @route   POST /api/v1/conversations/direct
 * @access  Private
 */
export const createDirectConversation = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Check if trying to message yourself
    if (userId === req.user._id.toString()) {
        res.status(400);
        throw new Error("Cannot create conversation with yourself");
    }

    // Check if other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
        res.status(404);
        throw new Error("User not found");
    }

    // Check privacy settings
    if (otherUser.privacySettings.allowMessages === "none") {
        res.status(403);
        throw new Error("This user doesn't accept messages");
    }

    if (otherUser.privacySettings.allowMessages === "following") {
        const isFollowing = otherUser.followers.some(id => id.equals(req.user._id));
        if (!isFollowing) {
            res.status(403);
            throw new Error("You need to be followed by this user to send messages");
        }
    }

    // Find or create direct conversation
    const conversation = await Conversation.findOrCreateDirectConversation(
        req.user._id,
        userId
    );

    // Populate data
    await conversation.populate("participants.user", "firstName lastName username profilePicture role isOnline");

    successResponse(res, 200, "Conversation retrieved successfully", {
        conversation,
    });
});

/**
 * @desc    Create group conversation
 * @route   POST /api/v1/conversations/group
 * @access  Private
 */
export const createGroupConversation = asyncHandler(async (req, res) => {
    const { name, participantIds, avatar, description } = req.body;

    // Validate participants
    if (!participantIds || participantIds.length === 0) {
        res.status(400);
        throw new Error("At least one participant is required");
    }

    // Check if users exist
    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length !== participantIds.length) {
        res.status(404);
        throw new Error("One or more users not found");
    }

    // Create participants array with creator as admin
    const participants = [
        {
            user: req.user._id,
            role: "admin",
            status: "active",
        }
    ];

    // Add other participants as members
    participantIds.forEach(userId => {
        if (userId !== req.user._id.toString()) {
            participants.push({
                user: userId,
                role: "member",
                status: "active",
            });
        }
    });

    // Create conversation
    const conversation = await Conversation.create({
        type: CONVERSATION_TYPES.GROUP,
        name,
        avatar,
        description,
        participants,
        createdBy: req.user._id,
    });

    // Populate data
    await conversation.populate("participants.user", "firstName lastName username profilePicture role");
    await conversation.populate("createdBy", "firstName lastName username");

    // Create system message
    await conversation.createSystemMessage(
        `${req.user.fullName} created the group`,
        "group_created",
        {
            createdBy: req.user._id,
        }
    );

    // Emit socket event to all participants
    const io = getIO();
    participants.forEach(p => {
        if (!p.user.equals(req.user._id)) {
            io.to(p.user.toString()).emit("new-conversation", conversation);
        }
    });

    successResponse(res, 201, "Group conversation created successfully", {
        conversation,
    });
});

/**
 * @desc    Update conversation details
 * @route   PUT /api/v1/conversations/:conversationId
 * @access  Private
 */
export const updateConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { name, description, avatar } = req.body;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(404);
        throw new Error("Conversation not found");
    }

    // Check if user is admin
    if (!conversation.isAdmin(req.user._id)) {
        res.status(403);
        throw new Error("Only admins can update conversation details");
    }

    // Update fields
    if (name) conversation.name = name;
    if (description !== undefined) conversation.description = description;
    if (avatar) conversation.avatar = avatar;

    await conversation.save();

    // Create system message
    if (name) {
        await conversation.createSystemMessage(
            `${req.user.fullName} changed the group name to "${name}"`,
            "name_changed",
            {
                changedBy: req.user._id,
                newName: name,
            }
        );
    }

    if (avatar) {
        await conversation.createSystemMessage(
            `${req.user.fullName} changed the group photo`,
            "avatar_changed",
            {
                changedBy: req.user._id,
            }
        );
    }

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("conversation-updated", conversation);

    successResponse(res, 200, "Conversation updated successfully", {
        conversation,
    });
});

/**
 * @desc    Delete conversation (soft delete)
 * @route   DELETE /api/v1/conversations/:conversationId
 * @access  Private
 */
export const deleteConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        res.status(404);
        throw new Error("Conversation not found");
    }

    // Only admins can delete group conversations
    if (conversation.type === CONVERSATION_TYPES.GROUP && !conversation.isAdmin(req.user._id)) {
        res.status(403);
        throw new Error("Only admins can delete group conversations");
    }

    // Soft delete
    conversation.isActive = false;
    await conversation.save();

    // Emit socket event
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("conversation-deleted", {
        conversationId,
    });

    successResponse(res, 200, "Conversation deleted successfully");
});

/**
 * @desc    Search conversations by name or description
 * @route   GET /api/v1/conversations/search
 * @access  Private
 */
export const searchConversations = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
        res.status(400);
        throw new Error("Search query is required");
    }

    const conversations = await Conversation.searchConversations(req.user._id, q.trim());

    successResponse(res, 200, "Search results retrieved successfully", {
        conversations,
        total: conversations.length,
    });
});

