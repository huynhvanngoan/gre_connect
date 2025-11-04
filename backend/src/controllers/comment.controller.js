// ============================================
// RE-EXPORT FROM SUB-CONTROLLERS
// ============================================

// CRUD Operations
export {
    createComment,
    getComments,
    getCommentById,
    getReplies,
    updateComment,
    deleteComment,
} from "./comment/crud.controller.js";

// Interactions
export {
    toggleLikeComment,
    reportComment,
    hideComment,
    getUserComments,
} from "./comment/interaction.controller.js";

// Default export for backward compatibility
export default {
    createComment,
    getComments,
    getCommentById,
    getReplies,
    updateComment,
    deleteComment,
    toggleLikeComment,
    reportComment,
    hideComment,
    getUserComments,
};
