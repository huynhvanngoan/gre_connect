// ============================================
// RE-EXPORT FROM SUB-CONTROLLERS
// ============================================

// CRUD Operations
export {
    getNotifications,
    getUnreadNotifications,
    getUnreadCount,
    getNotificationById,
} from "./notification/crud.controller.js";

// Actions
export {
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAllNotifications,
} from "./notification/action.controller.js";

// Admin Functions
export {
    createNotification,
    broadcastNotification,
    cleanupOldNotifications,
} from "./notification/admin.controller.js";

// Preferences
export {
    getNotificationPreferences,
    updateNotificationPreferences,
} from "./notification/preference.controller.js";

// Default export for backward compatibility
export default {
    getNotifications,
    getUnreadNotifications,
    getUnreadCount,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAllNotifications,
    createNotification,
    broadcastNotification,
    cleanupOldNotifications,
    getNotificationPreferences,
    updateNotificationPreferences,
};
