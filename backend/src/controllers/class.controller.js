// ============================================
// RE-EXPORT FROM SUB-CONTROLLERS
// ============================================

// CRUD Operations
export {
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass,
} from "./class/crud.controller.js";

// Student Management
export {
    enrollStudent,
    unenrollStudent,
    getClassStudents,
    joinClassWithCode,
} from "./class/student.controller.js";

// Teacher Management
export {
    addTeacher,
    removeTeacher,
} from "./class/teacher.controller.js";

// Materials Management
export {
    addMaterial,
    removeMaterial,
    getClassMaterials,
} from "./class/material.controller.js";

// Academic Management
export {
    updateSchedule,
    markAttendance,
    getAttendance,
    setFinalGrade,
    addImportantDate,
} from "./class/academic.controller.js";

// Search & Stats
export {
    searchClasses,
    generateJoinCode,
    getClassStats,
} from "./class/search.controller.js";

// Default export for backward compatibility
export default {
    // CRUD
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass,

    // Students
    enrollStudent,
    unenrollStudent,
    getClassStudents,
    joinClassWithCode,

    // Teachers
    addTeacher,
    removeTeacher,

    // Materials
    addMaterial,
    removeMaterial,
    getClassMaterials,

    // Academic
    updateSchedule,
    markAttendance,
    getAttendance,
    setFinalGrade,
    addImportantDate,

    // Search & Stats
    searchClasses,
    generateJoinCode,
    getClassStats,
};
