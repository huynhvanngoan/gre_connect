import express from "express";
import {
  initiateCall,
  joinCall,
  leaveCall,
  endCall,
  declineCall,
  toggleAudio,
  toggleVideo,
  getCallById,
  getCallHistory,
  handleSignaling,
  rateCall,
} from "../controllers/call.controller.js";

import {
  validateInitiateCall,
  validateJoinCall,
  validateLeaveCall,
  validateEndCall,
  validateToggleMedia,
  validateCallId,
  validateGetCallHistory,
  validateSignaling,
  validateRateCall,
} from "../validations/call.validation.js";

import { requireAuth } from "../middlewares/auth.middleware.js";
import { callRateLimit, apiRateLimit } from "../middlewares/arcjet.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";

const router = express.Router();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

router.use(requireAuth);

// ============================================
// CALL INITIATION & MANAGEMENT
// ============================================

/**
 * @route   POST /api/v1/calls/initiate
 * @desc    Initiate a new call
 * @access  Private
 */
router.post(
  "/initiate",
  callRateLimit,
  validate(validateInitiateCall),
  initiateCall
);

/**
 * @route   POST /api/v1/calls/:callId/join
 * @desc    Join an existing call
 * @access  Private
 */
router.post(
  "/:callId/join",
  validate(validateJoinCall),
  joinCall
);

/**
 * @route   POST /api/v1/calls/:callId/leave
 * @desc    Leave a call
 * @access  Private
 */
router.post(
  "/:callId/leave",
  validate(validateLeaveCall),
  leaveCall
);

/**
 * @route   POST /api/v1/calls/:callId/end
 * @desc    End a call (caller only)
 * @access  Private
 */
router.post(
  "/:callId/end",
  validate(validateEndCall),
  endCall
);

/**
 * @route   POST /api/v1/calls/:callId/decline
 * @desc    Decline an incoming call
 * @access  Private
 */
router.post(
  "/:callId/decline",
  validate(validateCallId),
  declineCall
);

// ============================================
// MEDIA CONTROLS
// ============================================

/**
 * @route   PUT /api/v1/calls/:callId/audio
 * @desc    Toggle audio on/off
 * @access  Private
 */
router.put(
  "/:callId/audio",
  validate(validateToggleMedia),
  toggleAudio
);

/**
 * @route   PUT /api/v1/calls/:callId/video
 * @desc    Toggle video on/off
 * @access  Private
 */
router.put(
  "/:callId/video",
  validate(validateToggleMedia),
  toggleVideo
);

// ============================================
// WEBRTC SIGNALING
// ============================================

/**
 * @route   POST /api/v1/calls/:callId/signal
 * @desc    Handle WebRTC signaling (offer, answer, ICE)
 * @access  Private
 */
router.post(
  "/:callId/signal",
  validate(validateSignaling),
  handleSignaling
);

// ============================================
// CALL INFO & HISTORY
// ============================================

/**
 * @route   GET /api/v1/calls/:callId
 * @desc    Get call details
 * @access  Private
 */
router.get(
  "/:callId",
  apiRateLimit,
  validate(validateCallId),
  getCallById
);

/**
 * @route   GET /api/v1/calls/history
 * @desc    Get call history for user
 * @access  Private
 */
router.get(
  "/history",
  apiRateLimit,
  validate(validateGetCallHistory),
  getCallHistory
);

// ============================================
// CALL RATING
// ============================================

/**
 * @route   POST /api/v1/calls/:callId/rate
 * @desc    Rate a completed call
 * @access  Private
 */
router.post(
  "/:callId/rate",
  apiRateLimit,
  validate(validateRateCall),
  rateCall
);

export default router;