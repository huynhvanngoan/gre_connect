// ============================================
// RE-EXPORT FROM SUB-CONTROLLERS
// ============================================

// Send Message
export {
    sendMessage,
} from "./message/send.controller.js";

// CRUD Operations
export {
    getMessages,
    getMessageById,
    editMessage,
    deleteMessage,
} from "./message/crud.controller.js";

// Reactions
export {
    reactToMessage,
    removeReaction,
} from "./message/reaction.controller.js";

// Read Status
export {
    markAsRead,
    markAllAsRead,
    getUnreadCount,
} from "./message/read.controller.js";

// Search & Media
export {
    forwardMessage,
    searchMessages,
    getMediaMessages,
} from "./message/search.controller.js";

// Default export for backward compatibility
export default {
    sendMessage,
    getMessages,
    getMessageById,
    editMessage,
    deleteMessage,
    reactToMessage,
    removeReaction,
    markAsRead,
    markAllAsRead,
    forwardMessage,
    searchMessages,
    getMediaMessages,
    getUnreadCount,
};
