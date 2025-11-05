import { getIO } from "../config/socket.js";

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

    console.log(`✅ User ${userId} is online`);
};

/**
 * Handle user going offline
 */
export const handleUserOffline = (userId) => {
    const io = getIO();

    // Broadcast to all connected clients
    io.emit("user-offline", { userId });

    console.log(`❌ User ${userId} is offline`);
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

/**
 * Handle user typing in meeting chat
 */
export const handleMeetingTyping = (meetingId, userId, isTyping) => {
    const io = getIO();

    io.to(`meeting-${meetingId}`).emit("user-typing-meeting", {
        meetingId,
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
// CALL SIGNALING
// ============================================

/**
 * Send call offer (for Agora signaling if needed)
 */
export const sendCallOffer = (callId, fromUserId, toUserId, offer) => {
    const io = getIO();

    io.to(toUserId.toString()).emit("call-offer", {
        callId,
        from: fromUserId,
        offer,
    });
};

/**
 * Send call answer (for Agora signaling if needed)
 */
export const sendCallAnswer = (callId, fromUserId, toUserId, answer) => {
    const io = getIO();

    io.to(toUserId.toString()).emit("call-answer", {
        callId,
        from: fromUserId,
        answer,
    });
};

/**
 * Send ICE candidate
 */
export const sendIceCandidate = (callId, fromUserId, toUserId, candidate) => {
    const io = getIO();

    io.to(toUserId.toString()).emit("ice-candidate", {
        callId,
        from: fromUserId,
        candidate,
    });
};

/**
 * Emit call ringing
 */
export const emitCallRinging = (callId, participants) => {
    const io = getIO();

    participants.forEach(userId => {
        io.to(userId.toString()).emit("call-ringing", {
            callId,
        });
    });
};

/**
 * Emit call accepted
 */
export const emitCallAccepted = (callId, userId, participants) => {
    const io = getIO();

    participants.forEach(participantId => {
        if (participantId.toString() !== userId.toString()) {
            io.to(participantId.toString()).emit("call-accepted", {
                callId,
                userId,
            });
        }
    });
};

/**
 * Emit call rejected
 */
export const emitCallRejected = (callId, userId, callerId) => {
    const io = getIO();

    io.to(callerId.toString()).emit("call-rejected", {
        callId,
        userId,
    });
};

/**
 * Emit call ended
 */
export const emitCallEnded = (callId, participants) => {
    const io = getIO();

    participants.forEach(userId => {
        io.to(userId.toString()).emit("call-ended", {
            callId,
        });
    });
};

// ============================================
// MEETING EVENTS
// ============================================

/**
 * Emit meeting started
 */
export const emitMeetingStarted = (meetingId, participants) => {
    const io = getIO();

    participants.forEach(userId => {
        io.to(userId.toString()).emit("meeting-started", {
            meetingId,
        });
    });
};

/**
 * Emit participant joined meeting
 */
export const emitParticipantJoinedMeeting = (meetingId, user) => {
    const io = getIO();

    io.to(`meeting-${meetingId}`).emit("participant-joined", {
        meetingId,
        user,
    });
};

/**
 * Emit participant left meeting
 */
export const emitParticipantLeftMeeting = (meetingId, userId) => {
    const io = getIO();

    io.to(`meeting-${meetingId}`).emit("participant-left", {
        meetingId,
        userId,
    });
};

/**
 * Emit meeting ended
 */
export const emitMeetingEnded = (meetingId, participants) => {
    const io = getIO();

    participants.forEach(userId => {
        io.to(userId.toString()).emit("meeting-ended", {
            meetingId,
        });
    });
};

/**
 * Emit screen share started
 */
export const emitScreenShareStarted = (meetingId, userId) => {
    const io = getIO();

    io.to(`meeting-${meetingId}`).emit("screen-share-started", {
        meetingId,
        userId,
    });
};

/**
 * Emit screen share stopped
 */
export const emitScreenShareStopped = (meetingId, userId) => {
    const io = getIO();

    io.to(`meeting-${meetingId}`).emit("screen-share-stopped", {
        meetingId,
        userId,
    });
};

/**
 * Emit recording started
 */
export const emitRecordingStarted = (meetingId) => {
    const io = getIO();

    io.to(`meeting-${meetingId}`).emit("recording-started", {
        meetingId,
    });
};

/**
 * Emit recording stopped
 */
export const emitRecordingStopped = (meetingId) => {
    const io = getIO();

    io.to(`meeting-${meetingId}`).emit("recording-stopped", {
        meetingId,
    });
};

/**
 * Send meeting chat message
 */
export const sendMeetingChatMessage = (meetingId, message) => {
    const io = getIO();

    io.to(`meeting-${meetingId}`).emit("meeting-chat-message", {
        meetingId,
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
    console.log(`Socket ${socket.id} joined conversation-${conversationId}`);
};

/**
 * Leave conversation room
 */
export const leaveConversationRoom = (socket, conversationId) => {
    socket.leave(`conversation-${conversationId}`);
    console.log(`Socket ${socket.id} left conversation-${conversationId}`);
};

/**
 * Join user to meeting room
 */
export const joinMeetingRoom = (socket, meetingId) => {
    socket.join(`meeting-${meetingId}`);
    console.log(`Socket ${socket.id} joined meeting-${meetingId}`);
};

/**
 * Leave meeting room
 */
export const leaveMeetingRoom = (socket, meetingId) => {
    socket.leave(`meeting-${meetingId}`);
    console.log(`Socket ${socket.id} left meeting-${meetingId}`);
};

/**
 * Join user to class room
 */
export const joinClassRoom = (socket, classId) => {
    socket.join(`class-${classId}`);
    console.log(`Socket ${socket.id} joined class-${classId}`);
};

/**
 * Leave class room
 */
export const leaveClassRoom = (socket, classId) => {
    socket.leave(`class-${classId}`);
    console.log(`Socket ${socket.id} left class-${classId}`);
};

/**
 * Join user to post room
 */
export const joinPostRoom = (socket, postId) => {
    socket.join(`post-${postId}`);
    console.log(`Socket ${socket.id} joined post-${postId}`);
};

/**
 * Leave post room
 */
export const leavePostRoom = (socket, postId) => {
    socket.leave(`post-${postId}`);
    console.log(`Socket ${socket.id} left post-${postId}`);
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
    handleMeetingTyping,

    // Messages
    emitMessageSent,
    emitMessageDelivered,
    emitMessageRead,
    emitMessageDeleted,
    emitMessageEdited,

    // Calls
    sendCallOffer,
    sendCallAnswer,
    sendIceCandidate,
    emitCallRinging,
    emitCallAccepted,
    emitCallRejected,
    emitCallEnded,

    // Meetings
    emitMeetingStarted,
    emitParticipantJoinedMeeting,
    emitParticipantLeftMeeting,
    emitMeetingEnded,
    emitScreenShareStarted,
    emitScreenShareStopped,
    emitRecordingStarted,
    emitRecordingStopped,
    sendMeetingChatMessage,

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
    joinMeetingRoom,
    leaveMeetingRoom,
    joinClassRoom,
    leaveClassRoom,
    joinPostRoom,
    leavePostRoom,
};