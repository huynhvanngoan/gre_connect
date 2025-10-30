import { body, param, query } from "express-validator";
import { CLASS_STATUS, SEMESTER } from "../utils/constants.js";

// ============================================
// CREATE CLASS VALIDATION
// ============================================

export const validateCreateClass = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Class name is required")
        .isLength({ min: 3, max: 100 })
        .withMessage("Class name must be between 3 and 100 characters"),
    
    body("code")
        .trim()
        .notEmpty()
        .withMessage("Class code is required")
        .isLength({ min: 2, max: 20 })
        .withMessage("Class code must be between 2 and 20 characters")
        .matches(/^[A-Z0-9-]+$/)
        .withMessage("Class code must contain only uppercase letters, numbers, and hyphens"),
    
    body("description")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must not exceed 1000 characters"),
    
    body("subject")
        .trim()
        .notEmpty()
        .withMessage("Subject is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Subject must be between 2 and 100 characters"),
    
    body("grade")
        .trim()
        .notEmpty()
        .withMessage("Grade is required"),
    
    body("academicYear")
        .trim()
        .notEmpty()
        .withMessage("Academic year is required")
        .matches(/^\d{4}-\d{4}$/)
        .withMessage("Academic year must be in format YYYY-YYYY (e.g., 2024-2025)"),
    
    body("semester")
        .optional()
        .isIn(Object.values(SEMESTER))
        .withMessage(`Semester must be one of: ${Object.values(SEMESTER).join(", ")}`),
    
    body("maxStudents")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Max students must be between 1 and 100"),
    
    body("startDate")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid date"),
    
    body("endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid date"),
    
    body("themeColor")
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage("Theme color must be a valid hex color code"),
];

// ============================================
// UPDATE CLASS VALIDATION
// ============================================

export const validateUpdateClass = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("name")
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage("Class name must be between 3 and 100 characters"),
    
    body("description")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must not exceed 1000 characters"),
    
    body("maxStudents")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Max students must be between 1 and 100"),
    
    body("status")
        .optional()
        .isIn(Object.values(CLASS_STATUS))
        .withMessage(`Status must be one of: ${Object.values(CLASS_STATUS).join(", ")}`),
    
    body("themeColor")
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage("Theme color must be a valid hex color code"),
];

// ============================================
// CLASS ID VALIDATION
// ============================================

export const validateClassId = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
];

// ============================================
// ENROLL STUDENT VALIDATION
// ============================================

export const validateEnrollStudent = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("studentId")
        .notEmpty()
        .withMessage("Student ID is required")
        .isMongoId()
        .withMessage("Invalid student ID"),
];

// ============================================
// UNENROLL STUDENT VALIDATION
// ============================================

export const validateUnenrollStudent = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    param("studentId")
        .isMongoId()
        .withMessage("Invalid student ID"),
];

// ============================================
// ADD TEACHER VALIDATION
// ============================================

export const validateAddTeacher = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("teacherId")
        .notEmpty()
        .withMessage("Teacher ID is required")
        .isMongoId()
        .withMessage("Invalid teacher ID"),
];

// ============================================
// REMOVE TEACHER VALIDATION
// ============================================

export const validateRemoveTeacher = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    param("teacherId")
        .isMongoId()
        .withMessage("Invalid teacher ID"),
];

// ============================================
// JOIN CODE VALIDATION
// ============================================

export const validateJoinCode = [
    body("joinCode")
        .trim()
        .notEmpty()
        .withMessage("Join code is required")
        .isLength({ min: 6, max: 6 })
        .withMessage("Join code must be 6 characters")
        .matches(/^[A-Z0-9]+$/)
        .withMessage("Join code must contain only uppercase letters and numbers"),
];

// ============================================
// GENERATE JOIN CODE VALIDATION
// ============================================

export const validateGenerateJoinCode = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("expiryDays")
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage("Expiry days must be between 1 and 365"),
];

// ============================================
// ADD MATERIAL VALIDATION
// ============================================

export const validateAddMaterial = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Material title is required")
        .isLength({ min: 1, max: 200 })
        .withMessage("Title must be between 1 and 200 characters"),
    
    body("description")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must not exceed 1000 characters"),
    
    body("category")
        .optional()
        .isIn(["lecture", "assignment", "reading", "video", "other"])
        .withMessage("Category must be one of: lecture, assignment, reading, video, other"),
];

// ============================================
// REMOVE MATERIAL VALIDATION
// ============================================

export const validateRemoveMaterial = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    param("materialId")
        .isMongoId()
        .withMessage("Invalid material ID"),
];

// ============================================
// ADD SCHEDULE VALIDATION
// ============================================

export const validateAddSchedule = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("schedule")
        .isArray({ min: 1 })
        .withMessage("Schedule must be an array with at least one entry"),
    
    body("schedule.*.dayOfWeek")
        .isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
        .withMessage("Invalid day of week"),
    
    body("schedule.*.startTime")
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage("Start time must be in HH:MM format"),
    
    body("schedule.*.endTime")
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage("End time must be in HH:MM format"),
    
    body("schedule.*.room")
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage("Room must not exceed 50 characters"),
    
    body("schedule.*.building")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Building must not exceed 100 characters"),
];

// ============================================
// MARK ATTENDANCE VALIDATION
// ============================================

export const validateMarkAttendance = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("studentId")
        .notEmpty()
        .withMessage("Student ID is required")
        .isMongoId()
        .withMessage("Invalid student ID"),
    
    body("status")
        .notEmpty()
        .withMessage("Attendance status is required")
        .isIn(["present", "absent", "late"])
        .withMessage("Status must be one of: present, absent, late"),
    
    body("date")
        .optional()
        .isISO8601()
        .withMessage("Date must be a valid date"),
    
    body("note")
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage("Note must not exceed 200 characters"),
];

// ============================================
// SET FINAL GRADE VALIDATION
// ============================================

export const validateSetFinalGrade = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    param("studentId")
        .isMongoId()
        .withMessage("Invalid student ID"),
    
    body("grade")
        .notEmpty()
        .withMessage("Grade is required")
        .isFloat({ min: 0, max: 100 })
        .withMessage("Grade must be between 0 and 100"),
    
    body("comment")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Comment must not exceed 500 characters"),
];

// ============================================
// SEARCH CLASSES VALIDATION
// ============================================

export const validateSearchClasses = [
    query("q")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
    
    query("subject")
        .optional()
        .trim(),
    
    query("grade")
        .optional()
        .trim(),
    
    query("academicYear")
        .optional()
        .matches(/^\d{4}-\d{4}$/)
        .withMessage("Academic year must be in format YYYY-YYYY"),
    
    query("status")
        .optional()
        .isIn(Object.values(CLASS_STATUS))
        .withMessage(`Status must be one of: ${Object.values(CLASS_STATUS).join(", ")}`),
];

// ============================================
// ADD IMPORTANT DATE VALIDATION
// ============================================

export const validateAddImportantDate = [
    param("classId")
        .isMongoId()
        .withMessage("Invalid class ID"),
    
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ min: 1, max: 200 })
        .withMessage("Title must be between 1 and 200 characters"),
    
    body("date")
        .notEmpty()
        .withMessage("Date is required")
        .isISO8601()
        .withMessage("Date must be a valid date"),
    
    body("type")
        .notEmpty()
        .withMessage("Type is required")
        .isIn(["exam", "assignment", "holiday", "event", "other"])
        .withMessage("Type must be one of: exam, assignment, holiday, event, other"),
    
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description must not exceed 500 characters"),
];

// ============================================
// EXPORTS
// ============================================

export default {
    validateCreateClass,
    validateUpdateClass,
    validateClassId,
    validateEnrollStudent,
    validateUnenrollStudent,
    validateAddTeacher,
    validateRemoveTeacher,
    validateJoinCode,
    validateGenerateJoinCode,
    validateAddMaterial,
    validateRemoveMaterial,
    validateAddSchedule,
    validateMarkAttendance,
    validateSetFinalGrade,
    validateSearchClasses,
    validateAddImportantDate,
};