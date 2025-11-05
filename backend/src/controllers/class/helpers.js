import { ROLES } from "../../utils/constants.js";

export function canAccessClass(classData, user) {
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

export function canEditClass(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    return false;
}

export function canDeleteClass(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    return false;
}

export function canManageStudents(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    return false;
}

export function canManageMaterials(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    return false;
}

export function canManageAttendance(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    return false;
}

export function canManageGrades(classData, user) {
    if (user.role === ROLES.STAFF) return true;
    if (classData.mainTeacher.equals(user._id)) return true;
    if (classData.assistantTeachers.some(id => id.equals(user._id))) return true;
    return false;
}

