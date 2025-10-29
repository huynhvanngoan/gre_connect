import { body, param, query } from "express-validator";
import { POST_TYPES, VISIBILITY_TYPES, POST_STATUS } from "../utils/constants.js";

// ============================================
// CREATE POST VALIDATION
// ============================================

export const validateCreatePost = [
    body("content")
        .trim()
        .notEmpty()
        .withMessage("Content is required")
        .isLength({ min: 1, max: 10000 })
        .withMessage("Content must be between 1 and 10000 characters"),
    
    body("postType")
        .optional()
        .isIn(Object.values(POST_TYPES))
        .withMessage(`Post type must be one of: ${Object.values(POST_TYPES).join(", ")}`),
    
    body("visibility")
        .optional()
        .isIn(Object.values(VISIBILITY_TYPES))
        .withMessage(`Visibility must be one of: ${Object.values(VISIBILITY_TYPES).join(", ")}`),
    
    body("targetClass")
        .optional()
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("targetClasses")
        .optional()
        .isArray()
        .withMessage("Target classes must be an array"),
    
    body("targetClasses.*")
        .optional()
        .isMongoId()
        .withMessage("Invalid class ID in target classes"),
    
    body("tags")
        .optional()
        .isArray()
        .withMessage("Tags must be an array"),
    
    body("tags.*")
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Each tag must be between 1 and 50 characters"),
    
    body("mentions")
        .optional()
        .isArray()
        .withMessage("Mentions must be an array"),
    
    body("mentions.*")
        .optional()
        .isMongoId()
        .withMessage("Invalid user ID in mentions"),
    
    body("allowComments")
        .optional()
        .isBoolean()
        .withMessage("Allow comments must be a boolean"),
    
    body("allowLikes")
        .optional()
        .isBoolean()
        .withMessage("Allow likes must be a boolean"),
    
    body("allowSharing")
        .optional()
        .isBoolean()
        .withMessage("Allow sharing must be a boolean"),
    
    body("scheduledFor")
        .optional()
        .isISO8601()
        .withMessage("Scheduled date must be a valid date")
        .custom((value) => {
            if (new Date(value) < new Date()) {
                throw new Error("Scheduled date must be in the future");
            }
            return true;
        }),
];

// ============================================
// UPDATE POST VALIDATION
// ============================================

export const validateUpdatePost = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    body("content")
        .optional()
        .trim()
        .isLength({ min: 1, max: 10000 })
        .withMessage("Content must be between 1 and 10000 characters"),
    
    body("visibility")
        .optional()
        .isIn(Object.values(VISIBILITY_TYPES))
        .withMessage(`Visibility must be one of: ${Object.values(VISIBILITY_TYPES).join(", ")}`),
    
    body("tags")
        .optional()
        .isArray()
        .withMessage("Tags must be an array"),
    
    body("allowComments")
        .optional()
        .isBoolean()
        .withMessage("Allow comments must be a boolean"),
    
    body("allowLikes")
        .optional()
        .isBoolean()
        .withMessage("Allow likes must be a boolean"),
    
    body("allowSharing")
        .optional()
        .isBoolean()
        .withMessage("Allow sharing must be a boolean"),
];

// ============================================
// HOMEWORK POST VALIDATION
// ============================================

export const validateHomeworkPost = [
    ...validateCreatePost,
    
    body("homeworkData")
        .notEmpty()
        .withMessage("Homework data is required for homework posts"),
    
    body("homeworkData.subject")
        .trim()
        .notEmpty()
        .withMessage("Subject is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Subject must be between 2 and 100 characters"),
    
    body("homeworkData.dueDate")
        .notEmpty()
        .withMessage("Due date is required")
        .isISO8601()
        .withMessage("Due date must be a valid date")
        .custom((value) => {
            if (new Date(value) < new Date()) {
                throw new Error("Due date must be in the future");
            }
            return true;
        }),
    
    body("homeworkData.maxScore")
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage("Max score must be between 1 and 1000"),
    
    body("homeworkData.allowLateSubmission")
        .optional()
        .isBoolean()
        .withMessage("Allow late submission must be a boolean"),
    
    body("homeworkData.lateSubmissionPenalty")
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage("Late submission penalty must be between 0 and 100 percent"),
    
    body("homeworkData.instructions")
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage("Instructions must not exceed 5000 characters"),
    
    body("homeworkData.rubric")
        .optional()
        .isArray()
        .withMessage("Rubric must be an array"),
];

// ============================================
// HOMEWORK SUBMISSION VALIDATION
// ============================================

export const validateHomeworkSubmission = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    body("content")
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage("Submission content must not exceed 5000 characters"),
    
    body("files")
        .optional()
        .isArray()
        .withMessage("Files must be an array"),
];

// ============================================
// GRADE HOMEWORK VALIDATION
// ============================================

export const validateGradeHomework = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    param("studentId")
        .isMongoId()
        .withMessage("Invalid student ID"),
    
    body("score")
        .notEmpty()
        .withMessage("Score is required")
        .isFloat({ min: 0 })
        .withMessage("Score must be a positive number"),
    
    body("feedback")
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage("Feedback must not exceed 2000 characters"),
];

// ============================================
// ANNOUNCEMENT POST VALIDATION
// ============================================

export const validateAnnouncementPost = [
    ...validateCreatePost,
    
    body("announcementData")
        .notEmpty()
        .withMessage("Announcement data is required"),
    
    body("announcementData.priority")
        .optional()
        .isIn(["low", "medium", "high", "urgent"])
        .withMessage("Priority must be low, medium, high, or urgent"),
    
    body("announcementData.expiresAt")
        .optional()
        .isISO8601()
        .withMessage("Expiry date must be a valid date")
        .custom((value) => {
            if (new Date(value) < new Date()) {
                throw new Error("Expiry date must be in the future");
            }
            return true;
        }),
    
    body("announcementData.requiresAcknowledgment")
        .optional()
        .isBoolean()
        .withMessage("Requires acknowledgment must be a boolean"),
];

// ============================================
// POLL POST VALIDATION
// ============================================

export const validatePollPost = [
    ...validateCreatePost,
    
    body("pollData")
        .notEmpty()
        .withMessage("Poll data is required"),
    
    body("pollData.question")
        .trim()
        .notEmpty()
        .withMessage("Poll question is required")
        .isLength({ min: 5, max: 500 })
        .withMessage("Poll question must be between 5 and 500 characters"),
    
    body("pollData.options")
        .isArray({ min: 2, max: 10 })
        .withMessage("Poll must have between 2 and 10 options"),
    
    body("pollData.options.*.text")
        .trim()
        .notEmpty()
        .withMessage("Poll option text is required")
        .isLength({ min: 1, max: 200 })
        .withMessage("Poll option must be between 1 and 200 characters"),
    
    body("pollData.allowMultipleVotes")
        .optional()
        .isBoolean()
        .withMessage("Allow multiple votes must be a boolean"),
    
    body("pollData.expiresAt")
        .optional()
        .isISO8601()
        .withMessage("Poll expiry date must be a valid date")
        .custom((value) => {
            if (new Date(value) < new Date()) {
                throw new Error("Poll expiry date must be in the future");
            }
            return true;
        }),
    
    body("pollData.showResultsBeforeVote")
        .optional()
        .isBoolean()
        .withMessage("Show results before vote must be a boolean"),
];

// ============================================
// VOTE POLL VALIDATION
// ============================================

export const validateVotePoll = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    body("optionIndex")
        .notEmpty()
        .withMessage("Option index is required")
        .isInt({ min: 0 })
        .withMessage("Option index must be a non-negative integer"),
];

// ============================================
// EVENT POST VALIDATION
// ============================================

export const validateEventPost = [
    ...validateCreatePost,
    
    body("eventData")
        .notEmpty()
        .withMessage("Event data is required"),
    
    body("eventData.title")
        .trim()
        .notEmpty()
        .withMessage("Event title is required")
        .isLength({ min: 5, max: 200 })
        .withMessage("Event title must be between 5 and 200 characters"),
    
    body("eventData.startDate")
        .notEmpty()
        .withMessage("Event start date is required")
        .isISO8601()
        .withMessage("Start date must be a valid date")
        .custom((value) => {
            if (new Date(value) < new Date()) {
                throw new Error("Start date must be in the future");
            }
            return true;
        }),
    
    body("eventData.endDate")
        .notEmpty()
        .withMessage("Event end date is required")
        .isISO8601()
        .withMessage("End date must be a valid date")
        .custom((value, { req }) => {
            if (new Date(value) < new Date(req.body.eventData.startDate)) {
                throw new Error("End date must be after start date");
            }
            return true;
        }),
    
    body("eventData.location")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Location must not exceed 500 characters"),
    
    body("eventData.isOnline")
        .optional()
        .isBoolean()
        .withMessage("Is online must be a boolean"),
    
    body("eventData.meetingLink")
        .optional()
        .trim()
        .isURL()
        .withMessage("Meeting link must be a valid URL"),
    
    body("eventData.maxAttendees")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Max attendees must be at least 1"),
];

// ============================================
// EVENT RSVP VALIDATION
// ============================================

export const validateEventRSVP = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    body("status")
        .notEmpty()
        .withMessage("RSVP status is required")
        .isIn(["going", "maybe", "not_going"])
        .withMessage("Status must be going, maybe, or not_going"),
];

// ============================================
// POST ID VALIDATION
// ============================================

export const validatePostId = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
];

// ============================================
// REPORT POST VALIDATION
// ============================================

export const validateReportPost = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Report reason is required")
        .isLength({ min: 10, max: 500 })
        .withMessage("Report reason must be between 10 and 500 characters"),
];

// ============================================
// PIN POST VALIDATION
// ============================================

export const validatePinPost = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
    
    body("pinnedUntil")
        .optional()
        .isISO8601()
        .withMessage("Pinned until must be a valid date")
        .custom((value) => {
            if (new Date(value) < new Date()) {
                throw new Error("Pinned until date must be in the future");
            }
            return true;
        }),
];

// ============================================
// SEARCH/FILTER VALIDATION
// ============================================

export const validateSearchPosts = [
    query("q")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
    
    query("postType")
        .optional()
        .isIn(Object.values(POST_TYPES))
        .withMessage(`Post type must be one of: ${Object.values(POST_TYPES).join(", ")}`),
    
    query("visibility")
        .optional()
        .isIn(Object.values(VISIBILITY_TYPES))
        .withMessage(`Visibility must be one of: ${Object.values(VISIBILITY_TYPES).join(", ")}`),
    
    query("classId")
        .optional()
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    query("userId")
        .optional()
        .isMongoId()
        .withMessage("Invalid user ID"),
    
    query("tags")
        .optional()
        .trim(),
    
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1"),
    
    query("sortBy")
        .optional()
        .isIn(["createdAt", "likesCount", "commentsCount", "viewsCount", "engagement"])
        .withMessage("Invalid sort field"),
    
    query("order")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Order must be asc or desc"),
];

// ============================================
// PAGINATION VALIDATION
// ============================================

export const validatePagination = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1"),
    
    query("sortBy")
        .optional()
        .isString()
        .withMessage("Sort by must be a string"),
    
    query("order")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Order must be asc or desc"),
];

// ============================================
// IMAGE CAPTION VALIDATION
// ============================================

export const validateImageCaption = [
    body("images")
        .optional()
        .isArray()
        .withMessage("Images must be an array"),
    
    body("images.*.caption")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Image caption must not exceed 500 characters"),
];

// ============================================
// VIDEO VALIDATION
// ============================================

export const validateVideo = [
    body("video")
        .optional()
        .isObject()
        .withMessage("Video must be an object"),
    
    body("video.duration")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Video duration must be at least 1 second"),
];

// ============================================
// ACKNOWLEDGE ANNOUNCEMENT VALIDATION
// ============================================

export const validateAcknowledge = [
    param("postId")
        .isMongoId()
        .withMessage("Invalid post ID"),
];