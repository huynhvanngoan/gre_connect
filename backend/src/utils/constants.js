// ============================================
// USER ROLES
// ============================================

export const ROLES = {
    STUDENT: "student",
    TEACHER: "teacher",
    STAFF: "staff",
};

// ============================================
// USER PERMISSIONS
// ============================================

export const PERMISSIONS = {
    // Post permissions
    CREATE_POST: "create_post",
    EDIT_POST: "edit_post",
    DELETE_POST: "delete_post",
    PIN_POST: "pin_post",
    
    // Announcement permissions
    CREATE_ANNOUNCEMENT: "create_announcement",
    EDIT_ANNOUNCEMENT: "edit_announcement",
    DELETE_ANNOUNCEMENT: "delete_announcement",
    
    // Homework permissions
    CREATE_HOMEWORK: "create_homework",
    EDIT_HOMEWORK: "edit_homework",
    DELETE_HOMEWORK: "delete_homework",
    GRADE_HOMEWORK: "grade_homework",
    VIEW_GRADES: "view_grades",
    
    // Class permissions
    CREATE_CLASS: "create_class",
    EDIT_CLASS: "edit_class",
    DELETE_CLASS: "delete_class",
    MANAGE_CLASSES: "manage_classes",
    VIEW_ALL_CLASSES: "view_all_classes",
    
    // User permissions
    MANAGE_USERS: "manage_users",
    BAN_USER: "ban_user",
    VIEW_ALL_USERS: "view_all_users",
    
    // Comment permissions
    MODERATE_COMMENTS: "moderate_comments",
    DELETE_ANY_COMMENT: "delete_any_comment",
    
    // Meeting permissions
    CREATE_MEETING: "create_meeting",
    START_MEETING: "start_meeting",
    END_MEETING: "end_meeting",
};

// ============================================
// CLASS STATUS
// ============================================

export const CLASS_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    ARCHIVED: "archived",
    DRAFT: "draft",
    UPCOMING: "upcoming",
};

// ============================================
// SEMESTER
// ============================================

export const SEMESTER = {
    FALL: "fall",
    SPRING: "spring",
    SUMMER: "summer",
    WINTER: "winter",
};

// ============================================
// POST TYPES
// ============================================

export const POST_TYPES = {
    ANNOUNCEMENT: "announcement",
    HOMEWORK: "homework",
    DISCUSSION: "discussion",
    GENERAL: "general",
    NORMAL: "normal",
    POLL: "poll",
    EVENT: "event",
};

// ============================================
// POST VISIBILITY
// ============================================

export const POST_VISIBILITY = {
    PUBLIC: "public",
    CLASS: "class",
    CLASS_SPECIFIC: "class_specific",
    TEACHERS_ONLY: "teachers_only",
    STUDENTS_ONLY: "students_only",
    FOLLOWERS: "followers",
    FOLLOWERS_ONLY: "followers_only",
    PRIVATE: "private",
};

export const VISIBILITY_TYPES = POST_VISIBILITY; // Alias for compatibility

// ============================================
// POST STATUS
// ============================================

export const POST_STATUS = {
    PUBLISHED: "published",
    DRAFT: "draft",
    ARCHIVED: "archived",
    DELETED: "deleted",
};

// ============================================
// HOMEWORK STATUS
// ============================================

export const HOMEWORK_STATUS = {
    PENDING: "pending",
    SUBMITTED: "submitted",
    GRADED: "graded",
    LATE: "late",
    MISSING: "missing",
};

// ============================================
// COMMENT TYPES
// ============================================

export const COMMENT_TYPES = {
    TEXT: "text",
    IMAGE: "image",
    FILE: "file",
};

// ============================================
// NOTIFICATION TYPES
// ============================================

export const NOTIFICATION_TYPES = {
    // Post notifications
    NEW_POST: "new_post",
    POST_LIKE: "post_like",
    POST_COMMENT: "post_comment",
    POST_SHARE: "post_share",
    POST_MENTION: "post_mention",
    
    // Homework notifications
    NEW_HOMEWORK: "new_homework",
    HOMEWORK_ASSIGNED: "homework_assigned",
    HOMEWORK_DUE_SOON: "homework_due_soon",
    HOMEWORK_GRADED: "homework_graded",
    HOMEWORK_SUBMITTED: "homework_submitted",
    
    // Class notifications
    CLASS_ANNOUNCEMENT: "class_announcement",
    NEW_ANNOUNCEMENT: "new_announcement",
    ANNOUNCEMENT_UPDATED: "announcement_updated",
    ANNOUNCEMENT_EXPIRING: "announcement_expiring",
    CLASS_MATERIAL_ADDED: "class_material_added",
    CLASS_SCHEDULE_CHANGE: "class_schedule_change",
    CLASS_JOINED: "class_joined",
    CLASS_REMOVED: "class_removed",
    
    // User notifications
    NEW_FOLLOWER: "new_follower",
    FOLLOW_REQUEST: "follow_request",
    MENTION: "mention",
    
    // Comment notifications
    COMMENT_REPLY: "comment_reply",
    COMMENT_LIKE: "comment_like",
    COMMENT_MENTION: "comment_mention",
    
    // Event notifications
    EVENT_INVITATION: "event_invitation",
    EVENT_REMINDER: "event_reminder",
    EVENT_UPDATED: "event_updated",
    EVENT_CANCELLED: "event_cancelled",
    
    // Poll notifications
    POLL_CREATED: "poll_created",
    POLL_ENDING_SOON: "poll_ending_soon",
    POLL_RESULTS: "poll_results",
    
    // Meeting notifications
    MEETING_INVITATION: "meeting_invitation",
    MEETING_STARTED: "meeting_started",
    MEETING_REMINDER: "meeting_reminder",
    MEETING_CANCELLED: "meeting_cancelled",
    
    // Message notifications
    NEW_MESSAGE: "new_message",
    
    // Call notifications
    INCOMING_CALL: "incoming_call",
    MISSED_CALL: "missed_call",
    
    // System notifications
    WELCOME: "welcome",
    SYSTEM_UPDATE: "system_update",
    ACCOUNT_WARNING: "account_warning",
    BADGE_EARNED: "badge_earned",
};

// ============================================
// NOTIFICATION PRIORITIES
// ============================================

export const NOTIFICATION_PRIORITIES = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
};

// ============================================
// MESSAGE TYPES
// ============================================

export const MESSAGE_TYPES = {
    TEXT: "text",
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    FILE: "file",
    LOCATION: "location",
    SYSTEM: "system",
};

// ============================================
// MESSAGE STATUS
// ============================================

export const MESSAGE_STATUS = {
    SENT: "sent",
    DELIVERED: "delivered",
    READ: "read",
    FAILED: "failed",
};

// ============================================
// CONVERSATION TYPES
// ============================================

export const CONVERSATION_TYPES = {
    DIRECT: "direct",
    GROUP: "group",
    CLASS: "class",
};

// ============================================
// CALL TYPES
// ============================================

export const CALL_TYPES = {
    VOICE: "voice",
    AUDIO: "audio",
    VIDEO: "video",
};

// ============================================
// CALL STATUS
// ============================================

export const CALL_STATUS = {
    INITIATED: "initiated",
    RINGING: "ringing",
    ONGOING: "ongoing",
    COMPLETED: "completed",
    ENDED: "ended",
    MISSED: "missed",
    DECLINED: "declined",
    CANCELLED: "cancelled",
    FAILED: "failed",
};

// ============================================
// MEETING TYPES
// ============================================

export const MEETING_TYPES = {
    CLASS: "class",
    CLASS_LECTURE: "class_lecture",
    GROUP_STUDY: "group_study",
    ONE_ON_ONE: "one_on_one",
    OFFICE_HOURS: "office_hours",
    PRESENTATION: "presentation",
    CONFERENCE: "conference",
    GENERAL: "general",
};

// ============================================
// MEETING STATUS
// ============================================

export const MEETING_STATUS = {
    SCHEDULED: "scheduled",
    ONGOING: "ongoing",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
};

// ============================================
// ATTENDANCE STATUS
// ============================================

export const ATTENDANCE_STATUS = {
    PRESENT: "present",
    ABSENT: "absent",
    LATE: "late",
    EXCUSED: "excused",
};

// ============================================
// REACTION TYPES
// ============================================

export const REACTION_TYPES = {
    LIKE: "like",
    LOVE: "love",
    HAHA: "haha",
    WOW: "wow",
    SAD: "sad",
    ANGRY: "angry",
};

// ============================================
// FILE TYPES
// ============================================

export const FILE_TYPES = {
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    DOCUMENT: "document",
    SPREADSHEET: "spreadsheet",
    PRESENTATION: "presentation",
    PDF: "pdf",
    ARCHIVE: "archive",
    OTHER: "other",
};

// ============================================
// FILE SIZE LIMITS (in bytes)
// ============================================

export const FILE_SIZE_LIMITS = {
    IMAGE: 10 * 1024 * 1024, // 10MB
    VIDEO: 100 * 1024 * 1024, // 100MB
    AUDIO: 20 * 1024 * 1024, // 20MB
    DOCUMENT: 50 * 1024 * 1024, // 50MB
    GENERAL: 10 * 1024 * 1024, // 10MB
};

// ============================================
// PAGINATION
// ============================================

export const PAGINATION = {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_PAGE: 1,
};

// ============================================
// SORTING
// ============================================

export const SORT_ORDER = {
    ASC: "asc",
    DESC: "desc",
};

// ============================================
// DATE FORMATS
// ============================================

export const DATE_FORMATS = {
    DATE_ONLY: "YYYY-MM-DD",
    TIME_ONLY: "HH:mm",
    DATE_TIME: "YYYY-MM-DD HH:mm",
    FULL: "YYYY-MM-DD HH:mm:ss",
};

// ============================================
// ERROR CODES
// ============================================

export const ERROR_CODES = {
    // Authentication errors
    UNAUTHORIZED: "UNAUTHORIZED",
    INVALID_TOKEN: "INVALID_TOKEN",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    
    // Authorization errors
    FORBIDDEN: "FORBIDDEN",
    INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
    
    // Validation errors
    VALIDATION_ERROR: "VALIDATION_ERROR",
    INVALID_INPUT: "INVALID_INPUT",
    MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
    
    // Resource errors
    NOT_FOUND: "NOT_FOUND",
    ALREADY_EXISTS: "ALREADY_EXISTS",
    CONFLICT: "CONFLICT",
    
    // Server errors
    INTERNAL_ERROR: "INTERNAL_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
};

// ============================================
// SUCCESS MESSAGES
// ============================================

export const SUCCESS_MESSAGES = {
    // User messages
    USER_CREATED: "User created successfully",
    USER_UPDATED: "User updated successfully",
    USER_DELETED: "User deleted successfully",
    
    // Auth messages
    LOGIN_SUCCESS: "Login successful",
    LOGOUT_SUCCESS: "Logout successful",
    PASSWORD_CHANGED: "Password changed successfully",
    
    // Post messages
    POST_CREATED: "Post created successfully",
    POST_UPDATED: "Post updated successfully",
    POST_DELETED: "Post deleted successfully",
    
    // Comment messages
    COMMENT_CREATED: "Comment created successfully",
    COMMENT_UPDATED: "Comment updated successfully",
    COMMENT_DELETED: "Comment deleted successfully",
    
    // Generic messages
    SUCCESS: "Operation completed successfully",
    CREATED: "Resource created successfully",
    UPDATED: "Resource updated successfully",
    DELETED: "Resource deleted successfully",
};

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
    // Authentication errors
    INVALID_CREDENTIALS: "Invalid email or password",
    UNAUTHORIZED: "You are not authorized to perform this action",
    TOKEN_MISSING: "Authentication token is missing",
    TOKEN_INVALID: "Invalid authentication token",
    
    // User errors
    USER_NOT_FOUND: "User not found",
    USER_ALREADY_EXISTS: "User already exists",
    USER_INACTIVE: "User account is inactive",
    USER_BANNED: "User account is banned",
    
    // Validation errors
    INVALID_INPUT: "Invalid input provided",
    MISSING_REQUIRED_FIELDS: "Missing required fields",
    
    // Generic errors
    INTERNAL_ERROR: "Internal server error",
    NOT_FOUND: "Resource not found",
    ALREADY_EXISTS: "Resource already exists",
    OPERATION_FAILED: "Operation failed",
};

// ============================================
// REGEX PATTERNS
// ============================================

export const REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[0-9+\-\s()]+$/,
    USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
    URL: /^https?:\/\/.+/,
    HASHTAG: /#[\w]+/g,
    MENTION: /@[\w]+/g,
};


// ============================================
// HTTP STATUS CODES
// ============================================

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};


// ============================================
// PRIVACY LEVELS
// ============================================

export const PRIVACY_LEVELS = {
    PUBLIC: "public",
    FRIENDS: "friends",
    FOLLOWERS: "followers",
    PRIVATE: "private",
    CUSTOM: "custom",
};

// ============================================
// ACTIVITY TYPES
// ============================================

export const ACTIVITY_TYPES = {
    POST_CREATED: "post_created",
    POST_LIKED: "post_liked",
    POST_COMMENTED: "post_commented",
    POST_SHARED: "post_shared",
    USER_FOLLOWED: "user_followed",
    HOMEWORK_SUBMITTED: "homework_submitted",
    BADGE_EARNED: "badge_earned",
    LEVEL_UP: "level_up",
};

// ============================================
// BADGE TYPES
// ============================================

export const BADGE_TYPES = {
    ENGAGEMENT: "engagement",
    ACHIEVEMENT: "achievement",
    SOCIAL: "social",
    ACADEMIC: "academic",
    SPECIAL: "special",
};

// ============================================
// REPORT REASONS
// ============================================

export const REPORT_REASONS = {
    SPAM: "spam",
    HARASSMENT: "harassment",
    INAPPROPRIATE_CONTENT: "inappropriate_content",
    HATE_SPEECH: "hate_speech",
    VIOLENCE: "violence",
    FALSE_INFORMATION: "false_information",
    BULLYING: "bullying",
    OTHER: "other",
};

// ============================================
// REPORT STATUS
// ============================================

export const REPORT_STATUS = {
    PENDING: "pending",
    REVIEWING: "reviewing",
    REVIEWED: "reviewed",
    RESOLVED: "resolved",
    DISMISSED: "dismissed",
};

// ============================================
// DAYS OF WEEK
// ============================================

export const DAYS_OF_WEEK = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
};

export const DAYS_OF_WEEK_SHORT = {
    MON: "Mon",
    TUE: "Tue",
    WED: "Wed",
    THU: "Thu",
    FRI: "Fri",
    SAT: "Sat",
    SUN: "Sun",
};

// ============================================
// GRADE LEVELS
// ============================================

export const GRADE_LEVELS = {
    KINDERGARTEN: "Kindergarten",
    GRADE_1: "1",
    GRADE_2: "2",
    GRADE_3: "3",
    GRADE_4: "4",
    GRADE_5: "5",
    GRADE_6: "6",
    GRADE_7: "7",
    GRADE_8: "8",
    GRADE_9: "9",
    GRADE_10: "10",
    GRADE_11: "11",
    GRADE_12: "12",
};

// ============================================
// SUBJECT CATEGORIES
// ============================================

export const SUBJECT_CATEGORIES = {
    MATH: "Mathematics",
    SCIENCE: "Science",
    ENGLISH: "English",
    HISTORY: "History",
    GEOGRAPHY: "Geography",
    PHYSICS: "Physics",
    CHEMISTRY: "Chemistry",
    BIOLOGY: "Biology",
    LITERATURE: "Literature",
    FOREIGN_LANGUAGE: "Foreign Language",
    PHYSICAL_EDUCATION: "Physical Education",
    ART: "Art",
    MUSIC: "Music",
    COMPUTER_SCIENCE: "Computer Science",
    OTHER: "Other",
};

// ============================================
// POLL TYPES
// ============================================

export const POLL_TYPES = {
    SINGLE_CHOICE: "single_choice",
    MULTIPLE_CHOICE: "multiple_choice",
    RATING: "rating",
    OPEN_ENDED: "open_ended",
};

// ============================================
// POLL STATUS
// ============================================

export const POLL_STATUS = {
    ACTIVE: "active",
    CLOSED: "closed",
    DRAFT: "draft",
};

// ============================================
// FILE CATEGORIES
// ============================================

export const FILE_CATEGORIES = {
    LECTURE: "lecture",
    ASSIGNMENT: "assignment",
    READING: "reading",
    VIDEO: "video",
    PRESENTATION: "presentation",
    DOCUMENT: "document",
    OTHER: "other",
};

// ============================================
// DEVICE TYPES
// ============================================

export const DEVICE_TYPES = {
    WEB: "web",
    MOBILE: "mobile",
    TABLET: "tablet",
    DESKTOP: "desktop",
};

// ============================================
// NOTIFICATION DELIVERY CHANNELS
// ============================================

export const NOTIFICATION_CHANNELS = {
    IN_APP: "in_app",
    EMAIL: "email",
    PUSH: "push",
    SMS: "sms",
};

// ============================================
// USER STATUS
// ============================================

export const USER_STATUS = {
    ONLINE: "online",
    OFFLINE: "offline",
    AWAY: "away",
    BUSY: "busy",
    DO_NOT_DISTURB: "do_not_disturb",
};

// ============================================
// LANGUAGE CODES
// ============================================

export const LANGUAGE_CODES = {
    EN: "en",
    VI: "vi",
    ES: "es",
    FR: "fr",
    DE: "de",
    ZH: "zh",
    JA: "ja",
    KO: "ko",
};

// ============================================
// EXPORT ALL
// ============================================

export default {
    ROLES,
    PERMISSIONS,
    CLASS_STATUS,
    SEMESTER,
    POST_TYPES,
    POST_VISIBILITY,
    VISIBILITY_TYPES,
    POST_STATUS,
    HOMEWORK_STATUS,
    COMMENT_TYPES,
    NOTIFICATION_TYPES,
    NOTIFICATION_PRIORITIES,
    MESSAGE_TYPES,
    MESSAGE_STATUS,
    CONVERSATION_TYPES,
    CALL_TYPES,
    CALL_STATUS,
    MEETING_TYPES,
    MEETING_STATUS,
    ATTENDANCE_STATUS,
    REACTION_TYPES,
    FILE_TYPES,
    FILE_SIZE_LIMITS,
    FILE_CATEGORIES,
    PAGINATION,
    SORT_ORDER,
    DATE_FORMATS,
    ERROR_CODES,
    SUCCESS_MESSAGES,
    ERROR_MESSAGES,
    REGEX_PATTERNS,
    HTTP_STATUS,
    PRIVACY_LEVELS,
    ACTIVITY_TYPES,
    BADGE_TYPES,
    REPORT_REASONS,
    REPORT_STATUS,
    DAYS_OF_WEEK,
    DAYS_OF_WEEK_SHORT,
    GRADE_LEVELS,
    SUBJECT_CATEGORIES,
    POLL_TYPES,
    POLL_STATUS,
    DEVICE_TYPES,
    NOTIFICATION_CHANNELS,
    USER_STATUS,
    LANGUAGE_CODES,
};