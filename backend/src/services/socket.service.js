import { getIO } from "../config/socket.js";
import { logger } from "../utils/logger.js";

// ============================================
// USER PRESENCE
// ============================================

/**
 * Handle user coming online
 */
export const handleUserOnline = (userId) => {
    const io = getIO();

    // Broadcast to all connected clients
    io.emit("user-online", { userId });

    logger.info(`✅ User ${userId} is online`);
};

/**
 * Handle user going offline
 */
export const handleUserOffline = (userId) => {
    const io = getIO();

    // Broadcast to all connected clients
    io.emit("user-offline", { userId });

    logger.info(`❌ User ${userId} is offline`);
};

/**
 * Get online users count
 */
export const getOnlineUsersCount = () => {
    const io = getIO();
    return io.engine.clientsCount;
};

// ============================================
// TYPING INDICATORS
// ============================================

/**
 * Handle user typing in conversation
 */
export const handleTyping = (conversationId, userId, isTyping) => {
    const io = getIO();

    // Broadcast to conversation room (except sender)
    io.to(`conversation-${conversationId}`).emit("user-typing", {
        conversationId,
        userId,
        isTyping,
    });
};


// ============================================
// MESSAGE DELIVERY STATUS
// ============================================

/**
 * Emit message sent event
 */
export const emitMessageSent = (conversationId, message) => {
    const io = getIO();

    io.to(`conversation-${conversationId}`).emit("new-message", {
        conversationId,
        message,
    });
};

/**
 * Emit message delivered event
 */
export const emitMessageDelivered = (messageId, userId) => {
    const io = getIO();

    io.to(userId.toString()).emit("message-delivered", {
        messageId,
    });
};

/**
 * Emit message read event
 */
export const emitMessageRead = (conversationId, messageIds, userId) => {
    const io = getIO();

    io.to(`conversation-${conversationId}`).emit("messages-read", {
        conversationId,
        messageIds,
        userId,
    });
};

/**
 * Emit message deleted event
 */
export const emitMessageDeleted = (conversationId, messageId) => {
    const io = getIO();

    io.to(`conversation-${conversationId}`).emit("message-deleted", {
        conversationId,
        messageId,
    });
};

/**
 * Emit message edited event
 */
export const emitMessageEdited = (conversationId, message) => {
    const io = getIO();

    io.to(`conversation-${conversationId}`).emit("message-edited", {
        conversationId,
        message,
    });
};



// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Send notification to user
 */
export const sendNotification = (userId, notification) => {
    const io = getIO();

    io.to(userId.toString()).emit("notification", notification);
};

/**
 * Broadcast notification to multiple users
 */
export const broadcastNotification = (userIds, notification) => {
    const io = getIO();

    userIds.forEach(userId => {
        io.to(userId.toString()).emit("notification", notification);
    });
};

// ============================================
// CLASS/GROUP BROADCASTS
// ============================================

/**
 * Broadcast to class
 */
export const broadcastToClass = (classId, event, data) => {
    const io = getIO();

    io.to(`class-${classId}`).emit(event, data);
};

/**
 * Broadcast to conversation
 */
export const broadcastToConversation = (conversationId, event, data) => {
    const io = getIO();

    io.to(`conversation-${conversationId}`).emit(event, data);
};

/**
 * Broadcast to all users
 */
export const broadcastToAll = (event, data) => {
    const io = getIO();

    io.emit(event, data);
};

// ============================================
// POST INTERACTIONS
// ============================================

/**
 * Emit new post
 */
export const emitNewPost = (classId, post) => {
    const io = getIO();

    if (classId) {
        io.to(`class-${classId}`).emit("new-post", { post });
    } else {
        io.emit("new-post", { post });
    }
};

/**
 * Emit post updated
 */
export const emitPostUpdated = (postId, updates) => {
    const io = getIO();

    io.emit("post-updated", { postId, updates });
};

/**
 * Emit post deleted
 */
export const emitPostDeleted = (postId) => {
    const io = getIO();

    io.emit("post-deleted", { postId });
};

/**
 * Emit new comment
 */
export const emitNewComment = (postId, comment) => {
    const io = getIO();

    io.to(`post-${postId}`).emit("new-comment", {
        postId,
        comment,
    });
};

/**
 * Emit comment deleted
 */
export const emitCommentDeleted = (postId, commentId) => {
    const io = getIO();

    io.to(`post-${postId}`).emit("comment-deleted", {
        postId,
        commentId,
    });
};

// ============================================
// ROOM MANAGEMENT
// ============================================

/**
 * Join user to conversation room
 */
export const joinConversationRoom = (socket, conversationId) => {
    socket.join(`conversation-${conversationId}`);
    logger.debug(`Socket ${socket.id} joined conversation-${conversationId}`);
};

/**
 * Leave conversation room
 */
export const leaveConversationRoom = (socket, conversationId) => {
    socket.leave(`conversation-${conversationId}`);
    logger.debug(`Socket ${socket.id} left conversation-${conversationId}`);
};


/**
 * Join user to class room
 */
export const joinClassRoom = (socket, classId) => {
    socket.join(`class-${classId}`);
    logger.debug(`Socket ${socket.id} joined class-${classId}`);
};

/**
 * Leave class room
 */
export const leaveClassRoom = (socket, classId) => {
    socket.leave(`class-${classId}`);
    logger.debug(`Socket ${socket.id} left class-${classId}`);
};

/**
 * Join user to post room
 */
export const joinPostRoom = (socket, postId) => {
    socket.join(`post-${postId}`);
    logger.debug(`Socket ${socket.id} joined post-${postId}`);
};

/**
 * Leave post room
 */
export const leavePostRoom = (socket, postId) => {
    socket.leave(`post-${postId}`);
    logger.debug(`Socket ${socket.id} left post-${postId}`);
};

// ============================================
// EXPORTS
// ============================================

export default {
    // User Presence
    handleUserOnline,
    handleUserOffline,
    getOnlineUsersCount,

    // Typing
    handleTyping,

    // Messages
    emitMessageSent,
    emitMessageDelivered,
    emitMessageRead,
    emitMessageDeleted,
    emitMessageEdited,

    // Notifications
    sendNotification,
    broadcastNotification,

    // Broadcasts
    broadcastToClass,
    broadcastToConversation,
    broadcastToAll,

    // Posts
    emitNewPost,
    emitPostUpdated,
    emitPostDeleted,
    emitNewComment,
    emitCommentDeleted,

    // Room Management
    joinConversationRoom,
    leaveConversationRoom,
    joinClassRoom,
    leaveClassRoom,
    joinPostRoom,
    leavePostRoom,
};