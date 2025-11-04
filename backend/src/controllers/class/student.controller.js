import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import User from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, ROLES, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { getIO } from "../../config/socket.js";
import { canAccessClass, canManageStudents } from "../../services/class.service.js";

/**
 * @desc    Enroll a student in class
 * @route   POST /api/classes/:classId/enroll
 * @access  Private (Teachers/Staff)
 */
export const enrollStudent = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { studentId } = req.body;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canManageStudents(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to enroll students");
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== ROLES.STUDENT) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Invalid student ID");
    }

    // Enroll student
    await classData.enrollStudent(studentId);

    // Notify student
    await Notification.createNotification({
        recipientId: studentId,
        senderId: req.user._id,
        type: NOTIFICATION_TYPES.CLASS_JOINED,
        title: "Enrolled in Class",
        message: `You have been enrolled in ${classData.name}`,
        actionUrl: `/classes/${classId}`,
    });

    // Emit socket event
    const io = getIO();
    io.to(studentId.toString()).emit("class-enrolled", {
        classId: classData._id,
        className: classData.name,
    });

    successResponse(res, HTTP_STATUS.OK, "Student enrolled successfully", null);
});

/**
 * @desc    Unenroll a student from class
 * @route   DELETE /api/classes/:classId/students/:studentId
 * @access  Private (Teachers/Staff)
 */
export const unenrollStudent = asyncHandler(async (req, res) => {
    const { classId, studentId } = req.params;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canManageStudents(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to unenroll students");
    }

    // Unenroll student
    await classData.unenrollStudent(studentId);

    // Notify student
    await Notification.createNotification({
        recipientId: studentId,
        senderId: req.user._id,
        type: NOTIFICATION_TYPES.CLASS_REMOVED,
        title: "Removed from Class",
        message: `You have been removed from ${classData.name}`,
    });

    successResponse(res, HTTP_STATUS.OK, "Student unenrolled successfully", null);
});

/**
 * @desc    Get all students in a class
 * @route   GET /api/classes/:classId/students
 * @access  Private
 */
export const getClassStudents = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { status = "active" } = req.query;

    const classData = await Class.findById(classId)
        .populate("students.student", "firstName lastName username profilePicture email studentId");

    if (!classData) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Class not found");
    }

    // Check access
    if (!canAccessClass(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have access to this class");
    }

    // Filter students by status
    const students = classData.students.filter(s => s.status === status);

    successResponse(res, HTTP_STATUS.OK, "Students retrieved successfully", {
        students,
        count: students.length,
    });
});

/**
 * @desc    Join class with join code
 * @route   POST /api/classes/join
 * @access  Private (Students)
 */
export const joinClassWithCode = asyncHandler(async (req, res) => {
    const { joinCode } = req.body;
    const userId = req.user._id;

    // Check if user is a student
    if (req.user.role !== ROLES.STUDENT) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "Only students can join classes with code");
    }

    // Find class by join code
    const classData = await Class.findByJoinCode(joinCode);

    if (!classData) {
        return errorResponse(res, HTTP_STATUS.NOT_FOUND, "Invalid or expired join code");
    }

    // Enroll student
    try {
        await classData.enrollStudent(userId);

        // Notify teacher
        await Notification.createNotification({
            recipientId: classData.mainTeacher,
            senderId: userId,
            type: NOTIFICATION_TYPES.CLASS_JOINED,
            title: "New Student",
            message: `${req.user.fullName} joined your class ${classData.name}`,
            actionUrl: `/classes/${classData._id}`,
        });

        successResponse(res, HTTP_STATUS.OK, "Successfully joined class", {
            class: {
                _id: classData._id,
                name: classData.name,
                code: classData.code,
                subject: classData.subject,
            },
        });
    } catch (error) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    }
});

