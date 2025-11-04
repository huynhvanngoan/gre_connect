import asyncHandler from "express-async-handler";
import User from "../../models/user.model.js";
import Class from "../../models/class.model.js";
import { findOr404 } from "../../utils/helpers.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @desc    Get user badges
 * @route   GET /api/users/me/badges
 * @access  Private
 */
export const getUserBadges = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");
    
    successResponse(res, HTTP_STATUS.OK, "Badges retrieved successfully", user.badges);
});

/**
 * @desc    Get leaderboard
 * @route   GET /api/users/leaderboard
 * @access  Private
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
    const { limit = 10, timeframe = "all" } = req.query;
    
    let dateFilter = {};
    
    if (timeframe === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter.createdAt = { $gte: weekAgo };
    } else if (timeframe === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter.createdAt = { $gte: monthAgo };
    }
    
    const leaderboard = await User.find({
        isActive: true,
        ...dateFilter
    })
    .select("firstName lastName username profilePicture points badges role")
    .sort({ points: -1 })
    .limit(parseInt(limit));
    
    successResponse(res, HTTP_STATUS.OK, "Leaderboard retrieved successfully", leaderboard);
});

/**
 * @desc    Get user's classes
 * @route   GET /api/users/me/classes
 * @access  Private
 */
export const getUserClasses = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");
    
    let classes = [];
    
    if (user.isStudent()) {
        // Get student's class
        if (user.roleSpecificData?.classId) {
            const classData = await Class.findById(user.roleSpecificData.classId)
                .populate("mainTeacher", "firstName lastName username profilePicture")
                .populate("assistantTeachers", "firstName lastName username profilePicture");
            
            if (classData) {
                classes = [classData];
            }
        }
    } else if (user.isTeacher()) {
        // Get teacher's classes
        classes = await Class.find({
            $or: [
                { mainTeacher: user._id },
                { assistantTeachers: user._id }
            ],
            status: "active"
        })
        .populate("mainTeacher", "firstName lastName username profilePicture")
        .populate("assistantTeachers", "firstName lastName username profilePicture");
    }
    
    successResponse(res, HTTP_STATUS.OK, "User classes retrieved successfully", classes);
});

/**
 * @desc    Get classmates (for students) or students in classes (for teachers)
 * @route   GET /api/users/me/classmates
 * @access  Private
 */
export const getClassmates = asyncHandler(async (req, res) => {
    const user = await findOr404(User, req.user._id, "User not found");
    
    let classmates = [];
    
    if (user.isStudent() && user.roleSpecificData?.classId) {
        // Get other students in the same class
        classmates = await User.findStudentsByClass(user.roleSpecificData.classId);
        
        // Exclude current user
        classmates = classmates.filter(
            student => student._id.toString() !== user._id.toString()
        );
    } else if (user.isTeacher()) {
        // Get all students from teacher's classes
        const classes = await Class.find({
            $or: [
                { mainTeacher: user._id },
                { assistantTeachers: user._id }
            ],
            status: "active"
        });
        
        const studentIds = classes.flatMap(c => 
            c.students
                .filter(s => s.status === "active")
                .map(s => s.student)
        );
        
        // Remove duplicates
        const uniqueStudentIds = [...new Set(studentIds.map(id => id.toString()))];
        
        classmates = await User.find({
            _id: { $in: uniqueStudentIds }
        })
        .select("firstName lastName username profilePicture bio roleSpecificData.grade");
    }
    
    successResponse(res, HTTP_STATUS.OK, "Classmates retrieved successfully", classmates);
});

