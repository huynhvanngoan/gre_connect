import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";
import { canAccessClass } from "../../services/class.service.js";
import { createPaginatedResponse } from "../../utils/helpers.js";

/**
 * @desc    Search classes
 * @route   GET /api/classes/search
 * @access  Private
 */
export const searchClasses = asyncHandler(async (req, res) => {
    const { q, limit = 20, page = 1 } = req.query;

    if (!q) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Search query is required");
    }

    const skip = (page - 1) * limit;

    const classes = await Class.searchClasses(q)
        .limit(parseInt(limit))
        .skip(skip)
        .populate("mainTeacher", "firstName lastName username profilePicture");

    const total = classes.length;

    return createPaginatedResponse(
        res,
        HTTP_STATUS.OK,
        "Search results retrieved successfully",
        classes,
        total,
        page,
        limit
    );
});

/**
 * @desc    Generate join code for class
 * @route   POST /api/classes/:classId/join-code
 * @access  Private (Teachers/Staff)
 */
export const generateJoinCode = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { expiryDays = 7 } = req.body;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canAccessClass(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to generate join code");
    }

    // Generate code
    await classData.generateJoinCode(expiryDays);

    successResponse(res, HTTP_STATUS.OK, "Join code generated successfully", {
        joinCode: classData.joinCode,
        expiresAt: classData.joinCodeExpiry,
    });
});

/**
 * @desc    Get statistics for a class
 * @route   GET /api/classes/:classId/stats
 * @access  Private (Teachers/Staff)
 */
export const getClassStats = asyncHandler(async (req, res) => {
    const { classId } = req.params;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canAccessClass(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have access to this class");
    }

    // Update stats
    await classData.updateStats();

    successResponse(res, HTTP_STATUS.OK, "Statistics retrieved successfully", {
        stats: classData.stats,
        studentCount: classData.studentCount,
        activeStudents: classData.activeStudents?.length || 0,
    });
});

