import asyncHandler from "express-async-handler";
import Class from "../../models/class.model.js";
import User from "../../models/user.model.js";
import { successResponse } from "../../utils/response.js";
import { HTTP_STATUS, CLASS_STATUS, PERMISSIONS, ROLES } from "../../utils/constants.js";
import { canAccessClass, canEditClass, canDeleteClass } from "./helpers.js";

/**
 * @desc    Create a new class
 * @route   POST /api/classes
 * @access  Private (Teachers/Staff)
 */
export const createClass = asyncHandler(async (req, res) => {
    const {
        name,
        code,
        description,
        subject,
        grade,
        academicYear,
        semester,
        maxStudents,
        startDate,
        endDate,
        schedule,
        classSettings,
    } = req.body;

    const userId = req.user._id;

    // Check permissions
    if (!req.user.hasPermission(PERMISSIONS.CREATE_CLASS)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to create classes");
    }

    // Check if code already exists
    const existingClass = await Class.findOne({ code: code.toUpperCase() });
    if (existingClass) {
        res.status(HTTP_STATUS.CONFLICT);
        throw new Error("A class with this code already exists");
    }

    // Create class data
    const classData = {
        name,
        code: code.toUpperCase(),
        description,
        subject,
        grade,
        academicYear,
        semester,
        mainTeacher: userId,
        maxStudents,
        startDate,
        endDate,
        schedule,
        classSettings,
    };

    // Handle cover image if uploaded
    if (req.file) {
        classData.coverImage = req.file.path;
    }

    // Create class
    const newClass = await Class.create(classData);

    // Update teacher's classes
    if (req.user.role === ROLES.TEACHER) {
        req.user.roleSpecificData.classesTeaching = req.user.roleSpecificData.classesTeaching || [];
        req.user.roleSpecificData.classesTeaching.push(newClass._id);
        await req.user.save();
    }

    // Populate main teacher
    await newClass.populate("mainTeacher", "firstName lastName username profilePicture role");

    successResponse(res, HTTP_STATUS.CREATED, "Class created successfully", { class: newClass });
});

/**
 * @desc    Get all classes
 * @route   GET /api/classes
 * @access  Private
 */
export const getClasses = asyncHandler(async (req, res) => {
    const {
        limit = 20,
        page = 1,
        subject,
        grade,
        academicYear,
        semester,
        status = CLASS_STATUS.ACTIVE,
    } = req.query;

    const skip = (page - 1) * limit;

    // Build query based on user role
    let query = { status };

    if (req.user.role === ROLES.STUDENT) {
        // Students see only their enrolled classes
        query["students.student"] = req.user._id;
        query["students.status"] = "active";
    } else if (req.user.role === ROLES.TEACHER) {
        // Teachers see classes they teach
        query.$or = [
            { mainTeacher: req.user._id },
            { assistantTeachers: req.user._id },
        ];
    }
    // Staff sees all classes

    // Apply filters
    if (subject) query.subject = subject;
    if (grade) query.grade = grade;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    // Get classes
    const classes = await Class.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate("mainTeacher", "firstName lastName username profilePicture")
        .populate("assistantTeachers", "firstName lastName username profilePicture")
        .lean();

    // Get total count
    const total = await Class.countDocuments(query);

    // Add virtual fields
    const classesWithVirtuals = classes.map(cls => ({
        ...cls,
        studentCount: cls.students?.filter(s => s.status === "active").length || 0,
        isFull: (cls.students?.filter(s => s.status === "active").length || 0) >= cls.maxStudents,
    }));

    successResponse(res, HTTP_STATUS.OK, "Classes retrieved successfully", {
        classes: classesWithVirtuals,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * @desc    Get single class by ID
 * @route   GET /api/classes/:classId
 * @access  Private
 */
export const getClassById = asyncHandler(async (req, res) => {
    const { classId } = req.params;

    const classData = await Class.findById(classId)
        .populate("mainTeacher", "firstName lastName username profilePicture role email")
        .populate("assistantTeachers", "firstName lastName username profilePicture role")
        .populate("students.student", "firstName lastName username profilePicture role studentId");

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check if user has access to this class
    if (!canAccessClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have access to this class");
    }

    // Convert to object and add virtual fields
    const classObject = classData.toObject({ virtuals: true });

    successResponse(res, HTTP_STATUS.OK, "Class retrieved successfully", { class: classObject });
});

/**
 * @desc    Update class
 * @route   PUT /api/classes/:classId
 * @access  Private (Main teacher/Staff)
 */
export const updateClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const updates = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to edit this class");
    }

    // Handle cover image if uploaded
    if (req.file) {
        updates.coverImage = req.file.path;
    }

    // Update fields
    Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
            classData[key] = updates[key];
        }
    });

    await classData.save();

    await classData.populate("mainTeacher", "firstName lastName username profilePicture");

    successResponse(res, HTTP_STATUS.OK, "Class updated successfully", { class: classData });
});

/**
 * @desc    Delete class
 * @route   DELETE /api/classes/:classId
 * @access  Private (Main teacher/Staff)
 */
export const deleteClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canDeleteClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to delete this class");
    }

    // Soft delete or archive
    classData.status = CLASS_STATUS.ARCHIVED;
    await classData.save();

    successResponse(res, HTTP_STATUS.OK, "Class deleted successfully");
});

/**
 * @desc    Search classes
 * @route   GET /api/classes/search
 * @access  Private
 */
export const searchClasses = asyncHandler(async (req, res) => {
    const { q, limit = 20, page = 1 } = req.query;

    if (!q) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Search query is required");
    }

    const skip = (page - 1) * limit;

    const classes = await Class.searchClasses(q)
        .limit(parseInt(limit))
        .skip(skip)
        .populate("mainTeacher", "firstName lastName username profilePicture");

    const total = classes.length;

    successResponse(res, HTTP_STATUS.OK, "Search results retrieved successfully", {
        classes,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
        },
    });
});

