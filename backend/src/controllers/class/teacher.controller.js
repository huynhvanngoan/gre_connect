import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import User from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse, errorResponse } from "../../utils/response.js";
import { HTTP_STATUS, ROLES, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { canEditClass } from "../../services/class.service.js";

/**
 * @desc    Add an assistant teacher to class
 * @route   POST /api/classes/:classId/teachers
 * @access  Private (Main teacher/Staff)
 */
export const addTeacher = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { teacherId } = req.body;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to add teachers");
    }

    // Check if teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== ROLES.TEACHER) {
        return errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Invalid teacher ID");
    }

    // Add teacher
    await classData.addTeacher(teacherId);

    // Notify teacher
    await Notification.createNotification({
        recipientId: teacherId,
        senderId: req.user._id,
        type: NOTIFICATION_TYPES.CLASS_JOINED,
        title: "Added to Class",
        message: `You have been added as assistant teacher to ${classData.name}`,
        actionUrl: `/classes/${classId}`,
    });

    successResponse(res, HTTP_STATUS.OK, "Teacher added successfully", null);
});

/**
 * @desc    Remove an assistant teacher from class
 * @route   DELETE /api/classes/:classId/teachers/:teacherId
 * @access  Private (Main teacher/Staff)
 */
export const removeTeacher = asyncHandler(async (req, res) => {
    const { classId, teacherId } = req.params;

    const classData = await findOr404(Class, classId, "Class not found");

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        return errorResponse(res, HTTP_STATUS.FORBIDDEN, "You don't have permission to remove teachers");
    }

    // Remove teacher
    await classData.removeTeacher(teacherId);

    successResponse(res, HTTP_STATUS.OK, "Teacher removed successfully", null);
});

