import asyncHandler from "express-async-handler";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { successResponse } from "../utils/response.js";
import { HTTP_STATUS, CLASS_STATUS, PERMISSIONS, NOTIFICATION_TYPES, ROLES } from "../utils/constants.js";
import { getIO } from "../config/socket.js";

// ============================================
// CREATE CLASS
// ============================================

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

// ============================================
// GET ALL CLASSES
// ============================================

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

// ============================================
// GET CLASS BY ID
// ============================================

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

// ============================================
// UPDATE CLASS
// ============================================

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

// ============================================
// DELETE CLASS
// ============================================

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

    // Or hard delete:
    // await classData.deleteOne();

    successResponse(res, HTTP_STATUS.OK, "Class deleted successfully");
});

// ============================================
// ENROLL STUDENT
// ============================================

/**
 * @desc    Enroll a student in class
 * @route   POST /api/classes/:classId/enroll
 * @access  Private (Teachers/Staff)
 */
export const enrollStudent = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { studentId } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canManageStudents(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to enroll students");
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== ROLES.STUDENT) {
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error("Invalid student ID");
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

    successResponse(res, HTTP_STATUS.OK, "Student enrolled successfully");
});

// ============================================
// UNENROLL STUDENT
// ============================================

/**
 * @desc    Unenroll a student from class
 * @route   DELETE /api/classes/:classId/students/:studentId
 * @access  Private (Teachers/Staff)
 */
export const unenrollStudent = asyncHandler(async (req, res) => {
    const { classId, studentId } = req.params;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canManageStudents(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to unenroll students");
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

    successResponse(res, HTTP_STATUS.OK, "Student unenrolled successfully");
});

// ============================================
// GET CLASS STUDENTS
// ============================================

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
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check access
    if (!canAccessClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have access to this class");
    }

    // Filter students by status
    const students = classData.students.filter(s => s.status === status);

    successResponse(res, HTTP_STATUS.OK, "Students retrieved successfully", {
        students,
        count: students.length,
    });
});

// ============================================
// ADD ASSISTANT TEACHER
// ============================================

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
        actionUrl: `/classes/${classId}`,
    });

    successResponse(res, HTTP_STATUS.OK, "Teacher added successfully");
});

// ============================================
// REMOVE ASSISTANT TEACHER
// ============================================

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


// ============================================
// JOIN CLASS WITH CODE
// ============================================

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
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("Only students can join classes with code");
    }

    // Find class by join code
    const classData = await Class.findByJoinCode(joinCode);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Invalid or expired join code");
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
        res.status(HTTP_STATUS.BAD_REQUEST);
        throw new Error(error.message);
    }
});

// ============================================
// GENERATE JOIN CODE
// ============================================

/**
 * @desc    Generate join code for class
 * @route   POST /api/classes/:classId/join-code
 * @access  Private (Teachers/Staff)
 */
export const generateJoinCode = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { expiryDays = 7 } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to generate join code");
    }

    // Generate code
    await classData.generateJoinCode(expiryDays);

    successResponse(res, HTTP_STATUS.OK, "Join code generated successfully", {
        joinCode: classData.joinCode,
        expiresAt: classData.joinCodeExpiry,
    });
});

// ============================================
// ADD MATERIAL
// ============================================

/**
 * @desc    Add material to class
 * @route   POST /api/classes/:classId/materials
 * @access  Private (Teachers)
 */
export const addMaterial = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { title, description, category } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canManageMaterials(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to add materials");
    }

    // Prepare material data
    const materialData = {
        title,
        description,
        category: category || "other",
        uploadedBy: req.user._id,
    };

    // Handle file upload
    if (req.file) {
        materialData.fileUrl = req.file.path;
        materialData.fileName = req.file.originalname;
        materialData.fileType = req.file.mimetype;
    }

    // Add material
    await classData.addMaterial(materialData);

    // Notify students
    const students = classData.students.filter(s => s.status === "active");
    for (const student of students) {
        await Notification.createNotification({
            recipientId: student.student,
            senderId: req.user._id,
            type: NOTIFICATION_TYPES.CLASS_MATERIAL_ADDED,
            title: "New Material",
            message: `New material added to ${classData.name}: ${title}`,
            actionUrl: `/classes/${classId}`,
        });
    }

    successResponse(res, HTTP_STATUS.CREATED, "Material added successfully");
});

// ============================================
// REMOVE MATERIAL
// ============================================

/**
 * @desc    Remove material from class
 * @route   DELETE /api/classes/:classId/materials/:materialId
 * @access  Private (Teachers)
 */
export const removeMaterial = asyncHandler(async (req, res) => {
    const { classId, materialId } = req.params;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canManageMaterials(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to remove materials");
    }

    // Remove material
    await classData.removeMaterial(materialId);

    successResponse(res, HTTP_STATUS.OK, "Material removed successfully");
});

// ============================================
// GET CLASS MATERIALS
// ============================================

/**
 * @desc    Get all materials for a class
 * @route   GET /api/classes/:classId/materials
 * @access  Private
 */
export const getClassMaterials = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { category } = req.query;

    const classData = await Class.findById(classId)
        .populate("materials.uploadedBy", "firstName lastName username");

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check access
    if (!canAccessClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have access to this class");
    }

    // Filter by category if provided
    let materials = classData.materials;
    if (category) {
        materials = materials.filter(m => m.category === category);
    }

    successResponse(res, HTTP_STATUS.OK, "Materials retrieved successfully", {
        materials,
        count: materials.length,
    });
});

// ============================================
// UPDATE SCHEDULE
// ============================================

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
            actionUrl: `/classes/${classId}`,
        });
    }

    successResponse(res, HTTP_STATUS.OK, "Schedule updated successfully", {
        schedule: classData.schedule,
    });
});

// ============================================
// MARK ATTENDANCE
// ============================================

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
    await classData.markAttendance(studentId, status);

    successResponse(res, HTTP_STATUS.OK, "Attendance marked successfully");
});

// ============================================
// GET ATTENDANCE
// ============================================

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
            attendanceRate: classData.stats.attendanceRate,
        },
    });
});

// ============================================
// SET FINAL GRADE
// ============================================

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
        actionUrl: `/classes/${classId}`,
    });

    successResponse(res, HTTP_STATUS.OK, "Grade set successfully");
});

// ============================================
// GET CLASS STATISTICS
// ============================================

/**
 * @desc    Get statistics for a class
 * @route   GET /api/classes/:classId/stats
 * @access  Private (Teachers/Staff)
 */
export const getClassStats = asyncHandler(async (req, res) => {
    const { classId } = req.params;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canAccessClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have access to this class");
    }

    // Update stats
    await classData.updateStats();

    successResponse(res, HTTP_STATUS.OK, "Statistics retrieved successfully", {
        stats: classData.stats,
        studentCount: classData.studentCount,
        activeStudents: classData.activeStudents.length,
    });
});

// ============================================
// SEARCH CLASSES
// ============================================

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

// ============================================
// ADD IMPORTANT DATE
// ============================================

/**
 * @desc    Add important date to class
 * @route   POST /api/classes/:classId/important-dates
 * @access  Private (Teachers)
 */
export const addImportantDate = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { title, date, type, description } = req.body;

    const classData = await Class.findById(classId);

    if (!classData) {
        res.status(HTTP_STATUS.NOT_FOUND);
        throw new Error("Class not found");
    }

    // Check permissions
    if (!canEditClass(classData, req.user)) {
        res.status(HTTP_STATUS.FORBIDDEN);
        throw new Error("You don't have permission to add important dates");
    }

    // Add date
    await classData.addImportantDate({
        title,
        date,
        type,
        description,
    });

    successResponse(res, HTTP_STATUS.CREATED, "Important date added successfully");
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function canAccessClass(classData, user) {
    // Staff can access all classes
    if (user.role === ROLES.STAFF) return true;

    // Teacher can access classes they teach
    if (user.role === ROLES.TEACHER) {
        if (classData.mainTeacher.equals(user._id)) return true;
        if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    }

    // Student can access enrolled classes
    if (user.role === ROLES.STUDENT) {
        return classData.students.some(s => s.student.equals(user._id) && s.status === "active");
    }

    return false;
}

function canEditClass(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    return false;
}

function canDeleteClass(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    return false;
}

function canManageStudents(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    return false;
}

function canManageMaterials(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    return false;
}

function canManageAttendance(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    return false;
}

function canManageGrades(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    return false;
}

export default {
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass,
    enrollStudent,
    unenrollStudent,
    getClassStudents,
    addTeacher,
    removeTeacher,
    joinClassWithCode,
    generateJoinCode,
    addMaterial,
    removeMaterial,
    getClassMaterials,
    updateSchedule,
    markAttendance,
    getAttendance,
    setFinalGrade,
    getClassStats,
    searchClasses,
    addImportantDate,
};