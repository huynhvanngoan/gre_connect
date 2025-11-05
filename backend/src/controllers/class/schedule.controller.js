import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import { Notification } from "../../models/notification.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, NOTIFICATION_TYPES } from "../../utils/constants.js";
import { canEditClass } from "./helpers.js";

/**
 * @desc    Update class schedule
 * @route   PUT /api/classes/:classId/schedule
 * @access  Private (Teachers/Staff)
 */
export const updateSchedule = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { schedule } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to update schedule");
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
            metadata: { classId },
        });
    }

    successResponse(res, HTTP_STATUS.OK, "Schedule updated successfully", {
        schedule: classData.schedule,
    });
});

