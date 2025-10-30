import express from "express";
import {
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass,
    enrollStudent,
    unenrollStudent,
    getClassStudents,
    addTeacher,
    removeTeacher,
    joinClassWithCode,
    generateJoinCode,
    addMaterial,
    removeMaterial,
    getClassMaterials,
    updateSchedule,
    markAttendance,
    getAttendance,
    setFinalGrade,
    getClassStats,
    searchClasses,
    addImportantDate,
} from "../controllers/class.controller.js";

import {
    requireAuth,
    requireRole,
    requirePermission,
    checkBanned,
} from "../middlewares/auth.middleware.js";

import {
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
} from "../validations/class.validation.js";

import { handleValidationErrors } from "../middlewares/validation.middleware.js";
import { uploadToCloudinary } from "../middlewares/upload.middleware.js";

const router = express.Router();

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(checkBanned);

// --------------------------------------------
// General Class Routes
// --------------------------------------------

/**
 * @route   GET /api/classes
 * @desc    Get all classes
 * @access  Private
 */
router.get("/", getClasses);

/**
 * @route   POST /api/classes
 * @desc    Create a new class
 * @access  Private (Teachers/Staff)
 */
router.post(
    "/",
    requireRole(["teacher", "staff"]),
    requirePermission("create_class"),
    uploadToCloudinary.single("coverImage"),
    validateCreateClass,
    handleValidationErrors,
    createClass
);

/**
 * @route   GET /api/classes/search
 * @desc    Search classes
 * @access  Private
 */
router.get(
    "/search",
    validateSearchClasses,
    handleValidationErrors,
    searchClasses
);

/**
 * @route   POST /api/classes/join
 * @desc    Join class with join code
 * @access  Private (Students)
 */
router.post(
    "/join",
    requireRole(["student"]),
    validateJoinCode,
    handleValidationErrors,
    joinClassWithCode
);

/**
 * @route   GET /api/classes/:classId
 * @desc    Get single class by ID
 * @access  Private
 */
router.get(
    "/:classId",
    validateClassId,
    handleValidationErrors,
    getClassById
);

/**
 * @route   PUT /api/classes/:classId
 * @desc    Update class
 * @access  Private (Main teacher/Staff)
 */
router.put(
    "/:classId",
    uploadToCloudinary.single("coverImage"),
    validateUpdateClass,
    handleValidationErrors,
    updateClass
);

/**
 * @route   DELETE /api/classes/:classId
 * @desc    Delete class
 * @access  Private (Main teacher/Staff)
 */
router.delete(
    "/:classId",
    validateClassId,
    handleValidationErrors,
    deleteClass
);

/**
 * @route   GET /api/classes/:classId/stats
 * @desc    Get class statistics
 * @access  Private (Teachers/Staff)
 */
router.get(
    "/:classId/stats",
    validateClassId,
    handleValidationErrors,
    getClassStats
);

// --------------------------------------------
// Join Code Routes
// --------------------------------------------

/**
 * @route   POST /api/classes/:classId/join-code
 * @desc    Generate join code for class
 * @access  Private (Teachers/Staff)
 */
router.post(
    "/:classId/join-code",
    requireRole(["teacher", "staff"]),
    validateGenerateJoinCode,
    handleValidationErrors,
    generateJoinCode
);

// --------------------------------------------
// Student Management
// --------------------------------------------

/**
 * @route   POST /api/classes/:classId/enroll
 * @desc    Enroll a student in class
 * @access  Private (Teachers/Staff)
 */
router.post(
    "/:classId/enroll",
    requireRole(["teacher", "staff"]),
    validateEnrollStudent,
    handleValidationErrors,
    enrollStudent
);

/**
 * @route   DELETE /api/classes/:classId/students/:studentId
 * @desc    Unenroll a student from class
 * @access  Private (Teachers/Staff)
 */
router.delete(
    "/:classId/students/:studentId",
    requireRole(["teacher", "staff"]),
    validateUnenrollStudent,
    handleValidationErrors,
    unenrollStudent
);

/**
 * @route   GET /api/classes/:classId/students
 * @desc    Get all students in a class
 * @access  Private
 */
router.get(
    "/:classId/students",
    validateClassId,
    handleValidationErrors,
    getClassStudents
);

/**
 * @route   PUT /api/classes/:classId/students/:studentId/grade
 * @desc    Set final grade for a student
 * @access  Private (Teachers)
 */
router.put(
    "/:classId/students/:studentId/grade",
    requireRole(["teacher", "staff"]),
    validateSetFinalGrade,
    handleValidationErrors,
    setFinalGrade
);

// --------------------------------------------
// Teacher Management
// --------------------------------------------

/**
 * @route   POST /api/classes/:classId/teachers
 * @desc    Add an assistant teacher to class
 * @access  Private (Main teacher/Staff)
 */
router.post(
    "/:classId/teachers",
    requireRole(["teacher", "staff"]),
    validateAddTeacher,
    handleValidationErrors,
    addTeacher
);

/**
 * @route   DELETE /api/classes/:classId/teachers/:teacherId
 * @desc    Remove an assistant teacher from class
 * @access  Private (Main teacher/Staff)
 */
router.delete(
    "/:classId/teachers/:teacherId",
    requireRole(["teacher", "staff"]),
    validateRemoveTeacher,
    handleValidationErrors,
    removeTeacher
);

// --------------------------------------------
// Materials Management
// --------------------------------------------

/**
 * @route   POST /api/classes/:classId/materials
 * @desc    Add material to class
 * @access  Private (Teachers)
 */
router.post(
    "/:classId/materials",
    requireRole(["teacher", "staff"]),
    uploadToCloudinary.single("file"),
    validateAddMaterial,
    handleValidationErrors,
    addMaterial
);

/**
 * @route   GET /api/classes/:classId/materials
 * @desc    Get all materials for a class
 * @access  Private
 */
router.get(
    "/:classId/materials",
    validateClassId,
    handleValidationErrors,
    getClassMaterials
);

/**
 * @route   DELETE /api/classes/:classId/materials/:materialId
 * @desc    Remove material from class
 * @access  Private (Teachers)
 */
router.delete(
    "/:classId/materials/:materialId",
    requireRole(["teacher", "staff"]),
    validateRemoveMaterial,
    handleValidationErrors,
    removeMaterial
);

// --------------------------------------------
// Schedule Management
// --------------------------------------------

/**
 * @route   PUT /api/classes/:classId/schedule
 * @desc    Update class schedule
 * @access  Private (Teachers/Staff)
 */
router.put(
    "/:classId/schedule",
    requireRole(["teacher", "staff"]),
    validateAddSchedule,
    handleValidationErrors,
    updateSchedule
);

// --------------------------------------------
// Attendance Management
// --------------------------------------------

/**
 * @route   POST /api/classes/:classId/attendance
 * @desc    Mark attendance for a student
 * @access  Private (Teachers)
 */
router.post(
    "/:classId/attendance",
    requireRole(["teacher", "staff"]),
    validateMarkAttendance,
    handleValidationErrors,
    markAttendance
);

/**
 * @route   GET /api/classes/:classId/attendance
 * @desc    Get attendance for class
 * @access  Private (Teachers)
 */
router.get(
    "/:classId/attendance",
    requireRole(["teacher", "staff"]),
    validateClassId,
    handleValidationErrors,
    getAttendance
);

// --------------------------------------------
// Important Dates
// --------------------------------------------

/**
 * @route   POST /api/classes/:classId/important-dates
 * @desc    Add important date to class
 * @access  Private (Teachers)
 */
router.post(
    "/:classId/important-dates",
    requireRole(["teacher", "staff"]),
    validateAddImportantDate,
    handleValidationErrors,
    addImportantDate
);

export default router;