import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { canAccessClass, canEditClass } from "./helpers.js";

/**
 * @desc    Generate join code for class
 * @route   POST /api/classes/:classId/join-code
 * @access  Private (Teachers/Staff)
 */
export const generateJoinCode = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { expiryDays = 7 } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to generate join code");
    }

    // Generate code
    const joinCode = await classData.generateJoinCode(expiryDays);

    successResponse(res, HTTP_STATUS.OK, "Join code generated successfully", {
        joinCode: joinCode.code,
        expiresAt: joinCode.expiresAt,
    });
});

/**
 * @desc    Get statistics for a class
 * @route   GET /api/classes/:classId/stats
 * @access  Private (Teachers/Staff)
 */
export const getClassStats = asyncHandler(async (req, res) => {
    const { classId } = req.params;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canAccessClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have access to this class");
    }

    // Update stats
    await classData.updateStats();

    successResponse(res, HTTP_STATUS.OK, "Statistics retrieved successfully", {
        stats: classData.stats,
        studentCount: classData.studentCount,
        activeStudents: classData.activeStudents?.length || 0,
    });
});

/**
 * @desc    Add important date to class
 * @route   POST /api/classes/:classId/important-dates
 * @access  Private (Teachers)
 */
export const addImportantDate = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { title, date, type, description } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to add important dates");
    }

    // Add date
    await classData.addImportantDate({
        title,
        date,
        type,
        description,
    });

    successResponse(res, HTTP_STATUS.CREATED, "Important date added successfully");
});

