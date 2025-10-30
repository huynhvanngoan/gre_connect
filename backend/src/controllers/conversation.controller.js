import asyncHandler from "express-async-handler";
import { Conversation } from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { CONVERSATION_TYPES } from "../utils/constants.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { getIO } from "../config/socket.js";

// ============================================
// GET USER'S CONVERSATIONS
// ============================================

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
    .populate("lastMessage")
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
      const unreadCount = await conv.getUnreadCount(req.user._id);
      return {
        ...conv.toObject(),
        unreadCount,
      };
    })
  );

  successResponse(res, 200, "Conversations retrieved successfully", {
    conversations: conversationsWithUnread,
    total: filteredConversations.length,
  });
});

// ============================================
// GET SINGLE CONVERSATION
// ============================================

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
        select: "firstName lastName username profilePicture"
      }
    });

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  // Check if user is participant
  if (!conversation.isParticipant(req.user._id)) {
    res.status(403);
    throw new Error("You are not a participant in this conversation");
  }

  // Get unread count
  const unreadCount = await conversation.getUnreadCount(req.user._id);

  successResponse(res, 200, "Conversation retrieved successfully", {
    conversation: {
      ...conversation.toObject(),
      unreadCount,
    },
  });
});

// ============================================
// CREATE DIRECT CONVERSATION
// ============================================

/**
 * @desc    Create or get direct conversation with another user
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

// ============================================
// CREATE GROUP CONVERSATION
// ============================================

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

// ============================================
// UPDATE CONVERSATION
// ============================================

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

// ============================================
// DELETE CONVERSATION
// ============================================

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

// ============================================
// ADD PARTICIPANT
// ============================================

/**
 * @desc    Add participant to conversation
 * @route   POST /api/v1/conversations/:conversationId/participants
 * @access  Private
 */
export const addParticipant = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { userId, role = "member" } = req.body;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  // Check permissions
  if (!conversation.settings.allowMemberInvites && !conversation.isAdmin(req.user._id)) {
    res.status(403);
    throw new Error("Only admins can add participants");
  }

  // Check if user exists
  const userToAdd = await User.findById(userId);
  if (!userToAdd) {
    res.status(404);
    throw new Error("User not found");
  }

  // Add participant
  await conversation.addParticipant(userId, req.user, role);

  // Populate updated conversation
  await conversation.populate("participants.user", "firstName lastName username profilePicture role");

  // Emit socket event
  const io = getIO();
  io.to(userId).emit("added-to-conversation", conversation);
  io.to(`conversation-${conversationId}`).emit("participant-added", {
    conversationId,
    user: userToAdd,
  });

  successResponse(res, 200, "Participant added successfully", {
    conversation,
  });
});

// ============================================
// REMOVE PARTICIPANT
// ============================================

/**
 * @desc    Remove participant from conversation
 * @route   DELETE /api/v1/conversations/:conversationId/participants/:userId
 * @access  Private
 */
export const removeParticipant = asyncHandler(async (req, res) => {
  const { conversationId, userId } = req.params;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  // Check if user is admin
  if (!conversation.isAdmin(req.user._id)) {
    res.status(403);
    throw new Error("Only admins can remove participants");
  }

  // Can't remove yourself this way
  if (userId === req.user._id.toString()) {
    res.status(400);
    throw new Error("Use leave endpoint to leave the conversation");
  }

  // Remove participant
  await conversation.removeParticipant(userId, req.user);

  // Emit socket event
  const io = getIO();
  io.to(userId).emit("removed-from-conversation", {
    conversationId,
  });
  io.to(`conversation-${conversationId}`).emit("participant-removed", {
    conversationId,
    userId,
  });

  successResponse(res, 200, "Participant removed successfully");
});

// ============================================
// LEAVE CONVERSATION
// ============================================

/**
 * @desc    Leave conversation
 * @route   POST /api/v1/conversations/:conversationId/leave
 * @access  Private
 */
export const leaveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  // Can't leave direct conversations
  if (conversation.type === CONVERSATION_TYPES.DIRECT) {
    res.status(400);
    throw new Error("Cannot leave direct conversations");
  }

  // Can't leave class conversations
  if (conversation.type === CONVERSATION_TYPES.CLASS) {
    res.status(400);
    throw new Error("Cannot leave class conversations");
  }

  // Leave conversation
  await conversation.leaveConversation(req.user._id);

  // Emit socket event
  const io = getIO();
  io.to(`conversation-${conversationId}`).emit("participant-left", {
    conversationId,
    userId: req.user._id,
  });

  successResponse(res, 200, "Left conversation successfully");
});

// ============================================
// UPDATE PARTICIPANT ROLE
// ============================================

/**
 * @desc    Update participant role
 * @route   PUT /api/v1/conversations/:conversationId/participants/:userId/role
 * @access  Private
 */
export const updateParticipantRole = asyncHandler(async (req, res) => {
  const { conversationId, userId } = req.params;
  const { role } = req.body;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  // Check if user is admin
  if (!conversation.isAdmin(req.user._id)) {
    res.status(403);
    throw new Error("Only admins can update participant roles");
  }

  // Update role
  await conversation.updateParticipantRole(userId, role, req.user);

  // Emit socket event
  const io = getIO();
  io.to(`conversation-${conversationId}`).emit("participant-role-updated", {
    conversationId,
    userId,
    role,
  });

  successResponse(res, 200, "Participant role updated successfully");
});

// ============================================
// UPDATE SETTINGS
// ============================================

/**
 * @desc    Update conversation settings
 * @route   PUT /api/v1/conversations/:conversationId/settings
 * @access  Private
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const settings = req.body;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  // Check if user is admin
  if (!conversation.isAdmin(req.user._id)) {
    res.status(403);
    throw new Error("Only admins can update settings");
  }

  // Update settings
  conversation.settings = {
    ...conversation.settings,
    ...settings,
  };

  await conversation.save();

  // Create system message
  await conversation.createSystemMessage(
    `${req.user.fullName} updated conversation settings`,
    "settings_changed",
    {
      changedBy: req.user._id,
    }
  );

  // Emit socket event
  const io = getIO();
  io.to(`conversation-${conversationId}`).emit("conversation-settings-updated", {
    conversationId,
    settings: conversation.settings,
  });

  successResponse(res, 200, "Settings updated successfully", {
    settings: conversation.settings,
  });
});

// ============================================
// MUTE/UNMUTE CONVERSATION
// ============================================

/**
 * @desc    Mute or unmute conversation
 * @route   PUT /api/v1/conversations/:conversationId/mute
 * @access  Private
 */
export const toggleMute = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { duration } = req.body; // duration in milliseconds, null for permanent

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const participant = conversation.participants.find(p =>
    p.user.equals(req.user._id)
  );

  if (!participant) {
    res.status(403);
    throw new Error("You are not a participant in this conversation");
  }

  if (participant.isMuted) {
    // Unmute
    await conversation.unmuteForUser(req.user._id);
  } else {
    // Mute
    await conversation.muteForUser(req.user._id, duration);
  }

  successResponse(res, 200, `Conversation ${participant.isMuted ? 'unmuted' : 'muted'} successfully`, {
    isMuted: !participant.isMuted,
  });
});

// ============================================
// ARCHIVE/UNARCHIVE CONVERSATION
// ============================================

/**
 * @desc    Archive or unarchive conversation
 * @route   PUT /api/v1/conversations/:conversationId/archive
 * @access  Private
 */
export const toggleArchive = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const participant = conversation.participants.find(p =>
    p.user.equals(req.user._id)
  );

  if (!participant) {
    res.status(403);
    throw new Error("You are not a participant in this conversation");
  }

  participant.isArchived = !participant.isArchived;
  await conversation.save();

  successResponse(res, 200, `Conversation ${participant.isArchived ? 'archived' : 'unarchived'} successfully`, {
    isArchived: participant.isArchived,
  });
});

// ============================================
// MARK AS READ
// ============================================

/**
 * @desc    Mark conversation as read
 * @route   PUT /api/v1/conversations/:conversationId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { messageId } = req.body; // Optional: specific message ID

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  if (!conversation.isParticipant(req.user._id)) {
    res.status(403);
    throw new Error("You are not a participant in this conversation");
  }

  await conversation.markAsRead(req.user._id, messageId);

  // Emit socket event
  const io = getIO();
  io.to(`conversation-${conversationId}`).emit("conversation-read", {
    conversationId,
    userId: req.user._id,
  });

  successResponse(res, 200, "Conversation marked as read");
});

// ============================================
// PIN/UNPIN MESSAGE
// ============================================

/**
 * @desc    Pin or unpin message
 * @route   PUT /api/v1/conversations/:conversationId/pin/:messageId
 * @access  Private
 */
export const togglePinMessage = asyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  // Check if user is admin
  if (!conversation.isAdmin(req.user._id)) {
    res.status(403);
    throw new Error("Only admins can pin messages");
  }

  // Check if message exists and belongs to this conversation
  const message = await Message.findOne({
    _id: messageId,
    conversation: conversationId,
  });

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  // Check if already pinned
  const isPinned = conversation.pinnedMessages.some(pm =>
    pm.message.equals(messageId)
  );

  if (isPinned) {
    // Unpin
    await conversation.unpinMessage(messageId);
  } else {
    // Pin
    await conversation.pinMessage(messageId, req.user._id);
  }

  // Emit socket event
  const io = getIO();
  io.to(`conversation-${conversationId}`).emit("message-pinned", {
    conversationId,
    messageId,
    isPinned: !isPinned,
  });

  successResponse(res, 200, `Message ${isPinned ? 'unpinned' : 'pinned'} successfully`);
});

// ============================================
// SEARCH CONVERSATIONS
// ============================================

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

// ============================================
// GET CONVERSATION PARTICIPANTS
// ============================================

/**
 * @desc    Get conversation participants
 * @route   GET /api/v1/conversations/:conversationId/participants
 * @access  Private
 */
export const getParticipants = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId)
    .populate("participants.user", "firstName lastName username profilePicture role isOnline lastSeen");

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  if (!conversation.isParticipant(req.user._id)) {
    res.status(403);
    throw new Error("You are not a participant in this conversation");
  }

  const activeParticipants = conversation.participants.filter(p => p.status === "active");

  successResponse(res, 200, "Participants retrieved successfully", {
    participants: activeParticipants,
    total: activeParticipants.length,
  });
});

// ============================================
// EXPORTS
// ============================================

export default {
  getUserConversations,
  getConversationById,
  createDirectConversation,
  createGroupConversation,
  updateConversation,
  deleteConversation,
  addParticipant,
  removeParticipant,
  leaveConversation,
  updateParticipantRole,
  updateSettings,
  toggleMute,
  toggleArchive,
  markAsRead,
  togglePinMessage,
  searchConversations,
  getParticipants,
};