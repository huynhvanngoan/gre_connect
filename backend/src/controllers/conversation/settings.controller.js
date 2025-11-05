import asyncHandler from "express-async-handler";
import { Conversation } from "../../models/conversation.model.js";
import Message from "../../models/message.model.js";
import { successResponse } from "../../utils/response.js";
import { getIO } from "../../config/socket.js";

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

