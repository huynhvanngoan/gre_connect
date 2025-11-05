import express from "express";
import {
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
} from "../controllers/conversation/index.js";

import {
  validateGetConversations,
  validateConversationId,
  validateCreateDirectConversation,
  validateCreateGroupConversation,
  validateUpdateConversation,
  validateAddParticipant,
  validateRemoveParticipant,
  validateUpdateParticipantRole,
  validateUpdateSettings,
  validateSearchConversations,
} from "../validations/conversation.validation.js";

import { requireAuth } from "../middlewares/auth.middleware.js";
import { apiRateLimit } from "../middlewares/arcjet.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";

const router = express.Router();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

router.use(requireAuth);
router.use(apiRateLimit);

// ============================================
// GET ROUTES
// ============================================

/**
 * @route   GET /api/v1/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get(
  "/",
  validate(validateGetConversations),
  getUserConversations
);

/**
 * @route   GET /api/v1/conversations/search
 * @desc    Search conversations
 * @access  Private
 */
router.get(
  "/search",
  validate(validateSearchConversations),
  searchConversations
);

/**
 * @route   GET /api/v1/conversations/:conversationId
 * @desc    Get conversation by ID
 * @access  Private
 */
router.get(
  "/:conversationId",
  validate(validateConversationId),
  getConversationById
);

/**
 * @route   GET /api/v1/conversations/:conversationId/participants
 * @desc    Get conversation participants
 * @access  Private
 */
router.get(
  "/:conversationId/participants",
  validate(validateConversationId),
  getParticipants
);

// ============================================
// POST ROUTES
// ============================================

/**
 * @route   POST /api/v1/conversations/direct
 * @desc    Create or get direct conversation
 * @access  Private
 */
router.post(
  "/direct",
  validate(validateCreateDirectConversation),
  createDirectConversation
);

/**
 * @route   POST /api/v1/conversations/group
 * @desc    Create group conversation
 * @access  Private
 */
router.post(
  "/group",
  validate(validateCreateGroupConversation),
  createGroupConversation
);

/**
 * @route   POST /api/v1/conversations/:conversationId/participants
 * @desc    Add participant to conversation
 * @access  Private
 */
router.post(
  "/:conversationId/participants",
  validate(validateAddParticipant),
  addParticipant
);

/**
 * @route   POST /api/v1/conversations/:conversationId/leave
 * @desc    Leave conversation
 * @access  Private
 */
router.post(
  "/:conversationId/leave",
  validate(validateConversationId),
  leaveConversation
);

// ============================================
// PUT ROUTES
// ============================================

/**
 * @route   PUT /api/v1/conversations/:conversationId
 * @desc    Update conversation details
 * @access  Private
 */
router.put(
  "/:conversationId",
  validate(validateUpdateConversation),
  updateConversation
);

/**
 * @route   PUT /api/v1/conversations/:conversationId/participants/:userId/role
 * @desc    Update participant role
 * @access  Private
 */
router.put(
  "/:conversationId/participants/:userId/role",
  validate(validateUpdateParticipantRole),
  updateParticipantRole
);

/**
 * @route   PUT /api/v1/conversations/:conversationId/settings
 * @desc    Update conversation settings
 * @access  Private
 */
router.put(
  "/:conversationId/settings",
  validate(validateUpdateSettings),
  updateSettings
);

/**
 * @route   PUT /api/v1/conversations/:conversationId/mute
 * @desc    Mute or unmute conversation
 * @access  Private
 */
router.put(
  "/:conversationId/mute",
  validate(validateConversationId),
  toggleMute
);

/**
 * @route   PUT /api/v1/conversations/:conversationId/archive
 * @desc    Archive or unarchive conversation
 * @access  Private
 */
router.put(
  "/:conversationId/archive",
  validate(validateConversationId),
  toggleArchive
);

/**
 * @route   PUT /api/v1/conversations/:conversationId/read
 * @desc    Mark conversation as read
 * @access  Private
 */
router.put(
  "/:conversationId/read",
  validate(validateConversationId),
  markAsRead
);

/**
 * @route   PUT /api/v1/conversations/:conversationId/pin/:messageId
 * @desc    Pin or unpin message
 * @access  Private
 */
router.put(
  "/:conversationId/pin/:messageId",
  togglePinMessage
);

// ============================================
// DELETE ROUTES
// ============================================

/**
 * @route   DELETE /api/v1/conversations/:conversationId
 * @desc    Delete conversation
 * @access  Private
 */
router.delete(
  "/:conversationId",
  validate(validateConversationId),
  deleteConversation
);

/**
 * @route   DELETE /api/v1/conversations/:conversationId/participants/:userId
 * @desc    Remove participant from conversation
 * @access  Private
 */
router.delete(
  "/:conversationId/participants/:userId",
  validate(validateRemoveParticipant),
  removeParticipant
);

export default router;