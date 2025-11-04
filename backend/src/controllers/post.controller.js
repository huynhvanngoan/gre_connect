// ============================================
// RE-EXPORT FROM SUB-CONTROLLERS
// ============================================

// CRUD Operations
export {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
} from "./post/crud.controller.js";

// Interactions
export {
    toggleLikePost,
    sharePost,
    reportPost,
} from "./post/interaction.controller.js";

// Admin Functions
export {
    togglePinPost,
    getPostsByClass,
    getPostAnalytics,
} from "./post/admin.controller.js";

// Special Post Types
export {
    submitHomework,
    gradeHomework,
    getHomeworkSubmissions,
} from "./post/homework.controller.js";

export {
    votePoll,
    getPollResults,
} from "./post/poll.controller.js";

export {
    rsvpEvent,
    getEventAttendees,
} from "./post/event.controller.js";

export {
    acknowledgeAnnouncement,
} from "./post/announcement.controller.js";

// Search & Trending
export {
    searchPosts,
    getTrendingPosts,
    getTrendingTopics,
} from "./post/search.controller.js";

// Default export for backward compatibility
export default {
    // CRUD
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,

    // Interactions
    toggleLikePost,
    sharePost,
    reportPost,

    // Admin
    togglePinPost,
    getPostsByClass,
    getPostAnalytics,

    // Special Types
    submitHomework,
    gradeHomework,
    getHomeworkSubmissions,
    acknowledgeAnnouncement,
    votePoll,
    getPollResults,
    rsvpEvent,
    getEventAttendees,

    // Search
    searchPosts,
    getTrendingPosts,
    getTrendingTopics,
};
