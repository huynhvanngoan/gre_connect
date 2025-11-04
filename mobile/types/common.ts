/**
 * Common Types and Interfaces for Mobile App
 */

// User types
export interface User {
    _id?: string;
    clerkId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    profilePicture?: string;
    role?: string;
    isVerified?: boolean;
    isActive?: boolean;
}

// Post types
export interface Post {
    _id?: string;
    user?: User;
    author?: User;
    content: string;
    postType?: string;
    visibility?: string;
    tags?: string[];
    createdAt: string;
    updatedAt?: string;
    isLiked?: boolean;
    likes?: any[];
    likesCount?: number;
    comments?: any[];
    commentsCount?: number;
    views?: any[];
    viewsCount?: number;
    shares?: any[];
    sharesCount?: number;
}

// Notification types
export interface Notification {
    _id?: string;
    recipientId?: string | User;
    senderId?: string | User;
    sender?: User;
    type?: string;
    title?: string;
    message?: string;
    actionUrl?: string;
    postId?: string;
    commentId?: string;
    isRead?: boolean;
    readAt?: string;
    createdAt: string;
    priority?: string;
}

// Conversation types
export interface ConversationParticipant {
    user: User | string;
    role?: string;
    status?: string;
}

export interface Conversation {
    _id?: string;
    type: 'direct' | 'group' | 'class';
    name?: string;
    description?: string;
    avatar?: string;
    participants?: ConversationParticipant[];
    lastMessage?: Message;
    lastMessageAt?: string;
    unreadCount?: number;
    classId?: string;
}

// Message types
export interface Message {
    _id?: string;
    conversation?: string;
    sender?: User | string;
    type?: string;
    content?: string;
    media?: any[];
    createdAt: string;
    readBy?: any[];
    reactions?: any[];
    replyTo?: string | Message;
}

// Search types
export interface TrendingTopic {
    topic: string;
    count?: number;
    postsCount?: number;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Loading states
export interface LoadingState {
    loading: boolean;
    error: string | null;
    refreshing?: boolean;
}

// Common component props
export interface BaseComponentProps {
    testID?: string;
}
