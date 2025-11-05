import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import User from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES, ROLES } from "../../utils/constants.js";
import { canEditClass } from "./helpers.js";

/**
 * @desc    Add an assistant teacher to class
 * @route   POST /api/classes/:classId/teachers
 * @access  Private (Main teacher/Staff)
 */
export const addTeacher = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { teacherId } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to add teachers");
    }

    // Check if teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== ROLES.TEACHER) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Invalid teacher ID");
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
        metadata: { classId },
    });

    successResponse(res, HTTP_STATUS.OK, "Teacher added successfully");
});

/**
 * @desc    Remove an assistant teacher from class
 * @route   DELETE /api/classes/:classId/teachers/:teacherId
 * @access  Private (Main teacher/Staff)
 */
export const removeTeacher = asyncHandler(async (req, res) => {
    const { classId, teacherId } = req.params;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to remove teachers");
    }

    // Remove teacher
    await classData.removeTeacher(teacherId);

    successResponse(res, HTTP_STATUS.OK, "Teacher removed successfully");
});

