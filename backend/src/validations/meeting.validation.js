import { body, param, query } from "express-validator";
import { MEETING_TYPES, MEETING_STATUS } from "../utils/constants.js";

// ============================================
// CREATE MEETING VALIDATION
// ============================================

export const validateCreateMeeting = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Meeting title is required")
        .isLength({ min: 3, max: 200 })
        .withMessage("Title must be between 3 and 200 characters"),
    
    body("description")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must not exceed 1000 characters"),
    
    body("meetingType")
        .notEmpty()
        .withMessage("Meeting type is required")
        .isIn(Object.values(MEETING_TYPES))
        .withMessage(`Meeting type must be one of: ${Object.values(MEETING_TYPES).join(", ")}`),
    
    body("scheduledStartTime")
        .notEmpty()
        .withMessage("Start time is required")
        .isISO8601()
        .withMessage("Start time must be a valid date"),
    
    body("scheduledEndTime")
        .notEmpty()
        .withMessage("End time is required")
        .isISO8601()
        .withMessage("End time must be a valid date")
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.scheduledStartTime)) {
                throw new Error("End time must be after start time");
            }
            return true;
        }),
    
    body("classId")
        .optional()
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("maxParticipants")
        .optional()
        .isInt({ min: 2, max: 500 })
        .withMessage("Max participants must be between 2 and 500"),
    
    body("isRecordingEnabled")
        .optional()
        .isBoolean()
        .withMessage("isRecordingEnabled must be a boolean"),
    
    body("waitingRoomEnabled")
        .optional()
        .isBoolean()
        .withMessage("waitingRoomEnabled must be a boolean"),
    
    body("requireApproval")
        .optional()
        .isBoolean()
        .withMessage("requireApproval must be a boolean"),
    
    body("allowParticipantsToShare")
        .optional()
        .isBoolean()
        .withMessage("allowParticipantsToShare must be a boolean"),
    
    body("allowChat")
        .optional()
        .isBoolean()
        .withMessage("allowChat must be a boolean"),
    
    body("invitedUsers")
        .optional()
        .isArray()
        .withMessage("Invited users must be an array"),
    
    body("invitedUsers.*")
        .optional()
        .isMongoId()
        .withMessage("Invalid user ID in invited users"),
];

// ============================================
// UPDATE MEETING VALIDATION
// ============================================

export const validateUpdateMeeting = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage("Title must be between 3 and 200 characters"),
    
    body("description")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must not exceed 1000 characters"),
    
    body("scheduledStartTime")
        .optional()
        .isISO8601()
        .withMessage("Start time must be a valid date"),
    
    body("scheduledEndTime")
        .optional()
        .isISO8601()
        .withMessage("End time must be a valid date"),
    
    body("maxParticipants")
        .optional()
        .isInt({ min: 2, max: 500 })
        .withMessage("Max participants must be between 2 and 500"),
    
    body("status")
        .optional()
        .isIn(Object.values(MEETING_STATUS))
        .withMessage(`Status must be one of: ${Object.values(MEETING_STATUS).join(", ")}`),
];

// ============================================
// MEETING ID VALIDATION
// ============================================

export const validateMeetingId = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
];

// ============================================
// JOIN MEETING VALIDATION
// ============================================

export const validateJoinMeeting = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    body("displayName")
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Display name must be between 1 and 50 characters"),
    
    body("isAudioEnabled")
        .optional()
        .isBoolean()
        .withMessage("isAudioEnabled must be a boolean"),
    
    body("isVideoEnabled")
        .optional()
        .isBoolean()
        .withMessage("isVideoEnabled must be a boolean"),
];

// ============================================
// LEAVE MEETING VALIDATION
// ============================================

export const validateLeaveMeeting = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
];

// ============================================
// START MEETING VALIDATION
// ============================================

export const validateStartMeeting = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
];

// ============================================
// END MEETING VALIDATION
// ============================================

export const validateEndMeeting = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
];

// ============================================
// INVITE PARTICIPANT VALIDATION
// ============================================

export const validateInviteParticipant = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("Invalid user ID"),
];

// ============================================
// REMOVE PARTICIPANT VALIDATION
// ============================================

export const validateRemoveParticipant = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
];

// ============================================
// UPDATE PARTICIPANT ROLE VALIDATION
// ============================================

export const validateUpdateParticipantRole = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
    
    body("role")
        .notEmpty()
        .withMessage("Role is required")
        .isIn(["host", "co-host", "presenter", "participant"])
        .withMessage("Role must be one of: host, co-host, presenter, participant"),
];

// ============================================
// TOGGLE RECORDING VALIDATION
// ============================================

export const validateToggleRecording = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    body("isRecording")
        .notEmpty()
        .withMessage("Recording status is required")
        .isBoolean()
        .withMessage("isRecording must be a boolean"),
];

// ============================================
// GET MEETINGS VALIDATION
// ============================================

export const validateGetMeetings = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1"),
    
    query("status")
        .optional()
        .isIn(Object.values(MEETING_STATUS))
        .withMessage(`Status must be one of: ${Object.values(MEETING_STATUS).join(", ")}`),
    
    query("meetingType")
        .optional()
        .isIn(Object.values(MEETING_TYPES))
        .withMessage(`Meeting type must be one of: ${Object.values(MEETING_TYPES).join(", ")}`),
    
    query("classId")
        .optional()
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    query("startDate")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid date"),
    
    query("endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid date"),
];

// ============================================
// SEND CHAT MESSAGE VALIDATION
// ============================================

export const validateSendMeetingChat = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    body("message")
        .trim()
        .notEmpty()
        .withMessage("Message is required")
        .isLength({ min: 1, max: 500 })
        .withMessage("Message must be between 1 and 500 characters"),
];

// ============================================
// MUTE/UNMUTE PARTICIPANT VALIDATION
// ============================================

export const validateMuteParticipant = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    param("userId")
        .isMongoId()
        .withMessage("Invalid user ID"),
    
    body("muted")
        .notEmpty()
        .withMessage("Muted status is required")
        .isBoolean()
        .withMessage("Muted must be a boolean"),
];

// ============================================
// SHARE SCREEN VALIDATION
// ============================================

export const validateShareScreen = [
    param("meetingId")
        .isMongoId()
        .withMessage("Invalid meeting ID"),
    
    body("isSharing")
        .notEmpty()
        .withMessage("Sharing status is required")
        .isBoolean()
        .withMessage("isSharing must be a boolean"),
];

// ============================================
// EXPORTS
// ============================================

export default {
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
};