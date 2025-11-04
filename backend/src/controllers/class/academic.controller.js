import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import { Notification } from "../../models/notification.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { canEditClass, canManageAttendance, canManageGrades } from "../../services/class.service.js";

/**
 * @desc    Update class schedule
 * @route   PUT /api/classes/:classId/schedule
 * @access  Private (Teachers/Staff)
 */
export const updateSchedule = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { schedule } = req.body;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to update schedule");
    }

    // Update schedule
    classData.schedule = schedule;
    await classData.save();

    // Notify students
    const students = classData.students.filter(s => s.status === "active");
    for (const student of students) {
        await Notification.createNotification({
            recipientId: student.student,
            senderId: req.user._id,
            type: NOTIFICATION_TYPES.CLASS_SCHEDULE_CHANGE,
            title: "Schedule Updated",
            message: `Schedule updated for ${classData.name}`,
            actionUrl: `/classes/${classId}`,
        });
    }

    successResponse(res, HTTP_STATUS.OK, "Schedule updated successfully", {
        schedule: classData.schedule,
    });
});

/**
 * @desc    Mark attendance for a student
 * @route   POST /api/classes/:classId/attendance
 * @access  Private (Teachers)
 */
export const markAttendance = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { studentId, status, date } = req.body;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canManageAttendance(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to mark attendance");
    }

    // Mark attendance
    await classData.markAttendance(studentId, status);

    successResponse(res, HTTP_STATUS.OK, "Attendance marked successfully", null);
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
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Class not found");
    }

    // Check permissions
    if (!canManageAttendance(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to view attendance");
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
            attendanceRate: classData.stats?.attendanceRate,
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

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canManageGrades(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to set grades");
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
        actionUrl: `/classes/${classId}`,
    });

    successResponse(res, HTTP_STATUS.OK, "Grade set successfully", null);
});

/**
 * @desc    Add important date to class
 * @route   POST /api/classes/:classId/important-dates
 * @access  Private (Teachers)
 */
export const addImportantDate = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { title, date, type, description } = req.body;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to add important dates");
    }

    // Add date
    await classData.addImportantDate({
        title,
        date,
        type,
        description,
    });

    successResponse(res, HTTP_STATUS.CREATED, "Important date added successfully", null);
});

