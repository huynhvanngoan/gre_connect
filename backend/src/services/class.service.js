import { ROLES } from "../utils/constants.js";
import { logger } from "../utils/logger.js";

/**
 * Check if user can access class
 */
export const canAccessClass = (classData, user) => {
    if (!classData || !user) return false;

    // Staff can access all classes
    if (user.role === ROLES.STAFF) return true;

    // Teacher can access classes they teach
    if (user.role === ROLES.TEACHER) {
        if (classData.mainTeacher?.equals(user._id)) return true;
        if (classData.assistantTeachers?.some(id => id.equals(user._id))) return true;
    }

    // Student can access enrolled classes
    if (user.role === ROLES.STUDENT) {
        return classData.students?.some(
            s => s.student?.equals(user._id) && s.status === "active"
        );
    }

    return false;
};

/**
 * Check if user can edit class
 */
export const canEditClass = (classData, user) => {
    if (!classData || !user) return false;
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher?.equals(user._id)) return true;
    return false;
};

/**
 * Check if user can delete class
 */
export const canDeleteClass = (classData, user) => {
    if (!classData || !user) return false;
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher?.equals(user._id)) return true;
    return false;
};

/**
 * Check if user can manage students
 */
export const canManageStudents = (classData, user) => {
    if (!classData || !user) return false;
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher?.equals(user._id)) return true;
    if (classData.assistantTeachers?.some(id => id.equals(user._id))) return true;
    return false;
};

/**
 * Check if user can manage materials
 */
export const canManageMaterials = (classData, user) => {
    if (!classData || !user) return false;
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher?.equals(user._id)) return true;
    if (classData.assistantTeachers?.some(id => id.equals(user._id))) return true;
    return false;
};

/**
 * Check if user can manage attendance
 */
export const canManageAttendance = (classData, user) => {
    if (!classData || !user) return false;
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher?.equals(user._id)) return true;
    if (classData.assistantTeachers?.some(id => id.equals(user._id))) return true;
    return false;
};

/**
 * Check if user can manage grades
 */
export const canManageGrades = (classData, user) => {
    if (!classData || !user) return false;
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher?.equals(user._id)) return true;
    if (classData.assistantTeachers?.some(id => id.equals(user._id))) return true;
    return false;
};

