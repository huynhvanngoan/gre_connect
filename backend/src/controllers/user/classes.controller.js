import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import Class from "../../models/class.model.js";

/**
 * @desc    Get user's classes
 * @route   GET /api/users/me/classes
 * @access  Private
 */
export const getUserClasses = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    let classes = [];

    if (user.isStudent()) {
        // Get student's class
        if (user.roleSpecificData.classId) {
            const classData = await Class.findById(user.roleSpecificData.classId)
                .populate("mainTeacher", "firstName lastName username profilePicture")
                .populate("assistantTeachers", "firstName lastName username profilePicture");
            if (classData) {
                classes.push(classData);
            }
        }
    } else if (user.isTeacher()) {
        // Get teacher's classes
        if (user.roleSpecificData.classesTeaching?.length > 0) {
            classes = await Class.find({
                _id: { $in: user.roleSpecificData.classesTeaching }
            })
                .populate("mainTeacher", "firstName lastName username profilePicture")
                .populate("assistantTeachers", "firstName lastName username profilePicture");
        }
    }

    res.status(200).json({
        success: true,
        data: classes,
    });
});

/**
 * @desc    Get classmates
 * @route   GET /api/users/me/classmates
 * @access  Private
 */
export const getClassmates = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (!user.isStudent()) {
        res.status(400);
        throw new Error("Only students can view classmates");
    }

    if (!user.roleSpecificData.classId) {
        res.status(400);
        throw new Error("User is not enrolled in any class");
    }

    const classData = await Class.findById(user.roleSpecificData.classId)
        .populate("students.student", "firstName lastName username profilePicture role");

    if (!classData) {
        res.status(404);
        throw new Error("Class not found");
    }

    // Get active students from the class
    const classmates = classData.students
        .filter(s => s.status === "active" && s.student && !s.student._id.equals(user._id))
        .map(s => s.student);

    res.status(200).json({
        success: true,
        data: classmates,
    });
});

