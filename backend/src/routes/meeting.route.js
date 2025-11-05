import express from "express";
import {
  createMeeting,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  getMeetings,
  getMyMeetings,
  startMeeting,
  endMeeting,
  joinMeeting,
  leaveMeeting,
  inviteParticipant,
  removeParticipant,
  updateParticipantRole,
  getParticipants,
  toggleRecording,
  getRecordings,
  sendMeetingChat,
  getMeetingChats,
  muteParticipant,
  unmuteParticipant,
  shareScreen,
  stopScreenShare,
  getActiveMeetings,
  getUpcomingMeetings,
  getPastMeetings,
  cancelMeeting,
  rescheduleMeeting,
  getMeetingStats,
  getMeetingToken,
} from "../controllers/meeting/index.js";
import {
  validateCreateMeeting,
  validateUpdateMeeting,
  validateMeetingId,
  validateJoinMeeting,
  validateLeaveMeeting,
  validateStartMeeting,
  validateEndMeeting,
  validateInviteParticipant,
  validateRemoveParticipant,
  validateUpdateParticipantRole,
  validateToggleRecording,
  validateGetMeetings,
  validateSendMeetingChat,
  validateMuteParticipant,
  validateShareScreen,
} from "../validations/meeting.validation.js";
import { requireAuth, optionalAuth } from "../middlewares/auth.middleware.js";
import {
  apiRateLimit,
  callRateLimit,
  strictRateLimit,
} from "../middlewares/arcjet.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";

const router = express.Router();

// ============================================
// MEETING CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/v1/meetings
 * @desc    Create a new meeting
 * @access  Private (Teacher, Staff)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/",
  requireAuth,
  apiRateLimit,
  validate(validateCreateMeeting),
  createMeeting
);

/**
 * @route   GET /api/v1/meetings
 * @desc    Get all meetings with filters
 * @access  Private
 * @ratelimit Standard API rate limit
 * @query   limit, page, status, meetingType, classId, startDate, endDate
 */
router.get(
  "/",
  requireAuth,
  apiRateLimit,
  validate(validateGetMeetings),
  getMeetings
);

/**
 * @route   GET /api/v1/meetings/my
 * @desc    Get current user's meetings
 * @access  Private
 * @ratelimit Standard API rate limit
 */
router.get(
  "/my",
  requireAuth,
  apiRateLimit,
  getMyMeetings
);

/**
 * @route   GET /api/v1/meetings/active
 * @desc    Get all active/ongoing meetings
 * @access  Private
 * @ratelimit Standard API rate limit
 */
router.get(
  "/active",
  requireAuth,
  apiRateLimit,
  getActiveMeetings
);

/**
 * @route   GET /api/v1/meetings/upcoming
 * @desc    Get upcoming scheduled meetings
 * @access  Private
 * @ratelimit Standard API rate limit
 */
router.get(
  "/upcoming",
  requireAuth,
  apiRateLimit,
  getUpcomingMeetings
);

/**
 * @route   GET /api/v1/meetings/past
 * @desc    Get past/ended meetings
 * @access  Private
 * @ratelimit Standard API rate limit
 */
router.get(
  "/past",
  requireAuth,
  apiRateLimit,
  getPastMeetings
);

/**
 * @route   GET /api/v1/meetings/:meetingId/token
 * @desc    Get Agora token for a meeting
 * @access  Private
 * @ratelimit Standard API rate limit
 */
router.get(
  "/:meetingId/token",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  getMeetingToken
);

/**
 * @route   GET /api/v1/meetings/:meetingId
 * @desc    Get meeting by ID
 * @access  Private
 * @ratelimit Standard API rate limit
 */
router.get(
  "/:meetingId",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  getMeetingById
);

/**
 * @route   PUT /api/v1/meetings/:meetingId
 * @desc    Update meeting
 * @access  Private (Host, Co-host, Staff)
 * @ratelimit Standard API rate limit
 */
router.put(
  "/:meetingId",
  requireAuth,
  apiRateLimit,
  validate(validateUpdateMeeting),
  updateMeeting
);

/**
 * @route   DELETE /api/v1/meetings/:meetingId
 * @desc    Delete meeting
 * @access  Private (Host, Staff)
 * @ratelimit Standard API rate limit
 */
router.delete(
  "/:meetingId",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  deleteMeeting
);

// ============================================
// MEETING LIFECYCLE OPERATIONS
// ============================================

/**
 * @route   POST /api/v1/meetings/:meetingId/start
 * @desc    Start a meeting
 * @access  Private (Host, Co-host)
 * @ratelimit Call rate limit
 */
router.post(
  "/:meetingId/start",
  requireAuth,
  callRateLimit,
  validate(validateStartMeeting),
  startMeeting
);

/**
 * @route   POST /api/v1/meetings/:meetingId/end
 * @desc    End a meeting
 * @access  Private (Host, Co-host, Staff)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/end",
  requireAuth,
  apiRateLimit,
  validate(validateEndMeeting),
  endMeeting
);

/**
 * @route   POST /api/v1/meetings/:meetingId/join
 * @desc    Join a meeting
 * @access  Private
 * @ratelimit Call rate limit
 */
router.post(
  "/:meetingId/join",
  requireAuth,
  callRateLimit,
  validate(validateJoinMeeting),
  joinMeeting
);

/**
 * @route   POST /api/v1/meetings/:meetingId/leave
 * @desc    Leave a meeting
 * @access  Private
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/leave",
  requireAuth,
  apiRateLimit,
  validate(validateLeaveMeeting),
  leaveMeeting
);

/**
 * @route   POST /api/v1/meetings/:meetingId/cancel
 * @desc    Cancel a meeting
 * @access  Private (Host, Staff)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/cancel",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  cancelMeeting
);

/**
 * @route   POST /api/v1/meetings/:meetingId/reschedule
 * @desc    Reschedule a meeting
 * @access  Private (Host, Co-host, Staff)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/reschedule",
  requireAuth,
  apiRateLimit,
  validate(validateUpdateMeeting),
  rescheduleMeeting
);

// ============================================
// PARTICIPANT MANAGEMENT
// ============================================

/**
 * @route   GET /api/v1/meetings/:meetingId/participants
 * @desc    Get all participants in a meeting
 * @access  Private (Participants only)
 * @ratelimit Standard API rate limit
 */
router.get(
  "/:meetingId/participants",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  getParticipants
);

/**
 * @route   POST /api/v1/meetings/:meetingId/participants/invite
 * @desc    Invite participant to meeting
 * @access  Private (Host, Co-host)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/participants/invite",
  requireAuth,
  apiRateLimit,
  validate(validateInviteParticipant),
  inviteParticipant
);

/**
 * @route   DELETE /api/v1/meetings/:meetingId/participants/:userId
 * @desc    Remove participant from meeting
 * @access  Private (Host, Co-host)
 * @ratelimit Standard API rate limit
 */
router.delete(
  "/:meetingId/participants/:userId",
  requireAuth,
  apiRateLimit,
  validate(validateRemoveParticipant),
  removeParticipant
);

/**
 * @route   PUT /api/v1/meetings/:meetingId/participants/:userId/role
 * @desc    Update participant role
 * @access  Private (Host only)
 * @ratelimit Standard API rate limit
 */
router.put(
  "/:meetingId/participants/:userId/role",
  requireAuth,
  apiRateLimit,
  validate(validateUpdateParticipantRole),
  updateParticipantRole
);

/**
 * @route   POST /api/v1/meetings/:meetingId/participants/:userId/mute
 * @desc    Mute a participant
 * @access  Private (Host, Co-host)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/participants/:userId/mute",
  requireAuth,
  apiRateLimit,
  validate(validateMuteParticipant),
  muteParticipant
);

/**
 * @route   POST /api/v1/meetings/:meetingId/participants/:userId/unmute
 * @desc    Unmute a participant
 * @access  Private (Host, Co-host)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/participants/:userId/unmute",
  requireAuth,
  apiRateLimit,
  validate(validateMuteParticipant),
  unmuteParticipant
);

// ============================================
// RECORDING OPERATIONS
// ============================================

/**
 * @route   POST /api/v1/meetings/:meetingId/recording/toggle
 * @desc    Start/Stop recording
 * @access  Private (Host, Co-host)
 * @ratelimit Strict rate limit
 */
router.post(
  "/:meetingId/recording/toggle",
  requireAuth,
  strictRateLimit,
  validate(validateToggleRecording),
  toggleRecording
);

/**
 * @route   GET /api/v1/meetings/:meetingId/recordings
 * @desc    Get all recordings of a meeting
 * @access  Private (Participants, Host, Staff)
 * @ratelimit Standard API rate limit
 */
router.get(
  "/:meetingId/recordings",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  getRecordings
);

// ============================================
// MEETING CHAT
// ============================================

/**
 * @route   POST /api/v1/meetings/:meetingId/chat
 * @desc    Send a chat message in meeting
 * @access  Private (Participants only)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/chat",
  requireAuth,
  apiRateLimit,
  validate(validateSendMeetingChat),
  sendMeetingChat
);

/**
 * @route   GET /api/v1/meetings/:meetingId/chat
 * @desc    Get all chat messages in meeting
 * @access  Private (Participants only)
 * @ratelimit Standard API rate limit
 */
router.get(
  "/:meetingId/chat",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  getMeetingChats
);

// ============================================
// SCREEN SHARING
// ============================================

/**
 * @route   POST /api/v1/meetings/:meetingId/screen-share/start
 * @desc    Start screen sharing
 * @access  Private (Host, Co-host, Presenter)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/screen-share/start",
  requireAuth,
  apiRateLimit,
  validate(validateShareScreen),
  shareScreen
);

/**
 * @route   POST /api/v1/meetings/:meetingId/screen-share/stop
 * @desc    Stop screen sharing
 * @access  Private (Current screen sharer)
 * @ratelimit Standard API rate limit
 */
router.post(
  "/:meetingId/screen-share/stop",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  stopScreenShare
);

// ============================================
// STATISTICS & ANALYTICS
// ============================================

/**
 * @route   GET /api/v1/meetings/:meetingId/stats
 * @desc    Get meeting statistics
 * @access  Private (Host, Staff)
 * @ratelimit Standard API rate limit
 */
router.get(
  "/:meetingId/stats",
  requireAuth,
  apiRateLimit,
  validate(validateMeetingId),
  getMeetingStats
);

// ============================================
// EXPORTS
// ============================================

export default router;