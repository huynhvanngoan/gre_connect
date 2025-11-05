import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { canManageAttendance, canManageGrades } from "./helpers.js";

/**
 * @desc    Mark attendance for a student
 * @route   POST /api/classes/:classId/attendance
 * @access  Private (Teachers)
 */
export const markAttendance = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { studentId, status, date } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canManageAttendance(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to mark attendance");
    }

    // Mark attendance
    await classData.markAttendance(studentId, status, date);

    successResponse(res, HTTP_STATUS.OK, "Attendance marked successfully");
});

/**
 * @desc    Get attendance for class
 * @route   GET /api/classes/:classId/attendance
 * @access  Private (Teachers)
 */
export const getAttendance = asyncHandler(async (req, res) => {
    const { classId } = req.params;

    const classData = await Class.findById(classId)
        .populate("students.student", "firstName lastName username profilePicture studentId");

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canManageAttendance(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to view attendance");
    }

    // Get attendance data
    const attendance = classData.students.map(s => ({
        student: s.student,
        attendance: s.attendance,
        enrolledAt: s.enrolledAt,
    }));

    successResponse(res, HTTP_STATUS.OK, "Attendance retrieved successfully", {
        attendance,
        stats: {
            attendanceRate: classData.stats?.attendanceRate || 0,
        },
    });
});

/**
 * @desc    Set final grade for a student
 * @route   PUT /api/classes/:classId/students/:studentId/grade
 * @access  Private (Teachers)
 */
export const setFinalGrade = asyncHandler(async (req, res) => {
    const { classId, studentId } = req.params;
    const { grade } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canManageGrades(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to set grades");
    }

    // Set grade
    await classData.setFinalGrade(studentId, grade);

    // Notify student
    await Notification.createNotification({
        recipientId: studentId,
        senderId: req.user._id,
        type: NOTIFICATION_TYPES.HOMEWORK_GRADED,
        title: "Final Grade Posted",
        message: `Your final grade for ${classData.name} has been posted: ${grade}`,
        metadata: { classId },
    });

    successResponse(res, HTTP_STATUS.OK, "Grade set successfully");
});

