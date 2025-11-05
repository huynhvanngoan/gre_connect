// API Configuration
// Read from environment variable, fallback to defaults
const getApiUrl = () => {
  // Expo uses EXPO_PUBLIC_ prefix for environment variables
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Fallback defaults
  return __DEV__ 
    ? 'http://192.168.100.174:5001/api/v1'  // Development - use your computer's IP
   
    : 'https://gre-connect-omega.vercel.app/api/v1'; // Production - Vercel
};

export const API_BASE_URL = getApiUrl();

export const API_ENDPOINTS = {
  // Health
  health: '/health',
  
  // Auth
  auth: {
    sync: '/auth/sync',
    check: '/auth/check',
    logout: '/auth/logout',
  },
  
  // Posts
  posts: {
    list: '/posts',
    search: '/posts/search',
    trending: '/posts/trending',
    trendingTopics: '/posts/trending-topics',
    get: (id: string) => `/posts/${id}`,
    like: (id: string) => `/posts/${id}/like`,
    share: (id: string) => `/posts/${id}/share`,
  },
  // Comments
  comments: {
    list: (postId: string) => `/comments/${postId}`,
    create: (postId: string) => `/comments/${postId}`,
    get: (commentId: string) => `/comments/comment/${commentId}`,
    update: (commentId: string) => `/comments/${commentId}`,
    delete: (commentId: string) => `/comments/${commentId}`,
    like: (commentId: string) => `/comments/${commentId}/like`,
  },
  
  // Users
  users: {
    search: '/users/search',
    profile: (id: string) => `/users/profile/${id}`,
    me: '/users/me',
  },
  
  // Conversations
  conversations: {
    list: '/conversations',
    search: '/conversations/search',
    get: (id: string) => `/conversations/${id}`,
    participants: (id: string) => `/conversations/${id}/participants`,
    createDirect: '/conversations/direct',
    createGroup: '/conversations/group',
  },
  
  // Messages
  messages: {
    list: (conversationId: string) => `/messages/${conversationId}`,
    send: (conversationId: string) => `/messages/${conversationId}`,
    get: (messageId: string) => `/messages/message/${messageId}`,
    markRead: (messageId: string) => `/messages/${messageId}/read`,
    markAllRead: (conversationId: string) => `/messages/${conversationId}/read-all`,
  },

  // Notifications
  notifications: {
    list: '/notifications',
    unread: '/notifications/unread',
    unreadCount: '/notifications/unread/count',
    get: (id: string) => `/notifications/${id}`,
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    dismiss: (id: string) => `/notifications/${id}`,
    dismissAll: '/notifications/dismiss-all',
    preferences: '/notifications/preferences',
  },

  // Calls
  calls: {
    list: '/calls/history',
    history: '/calls/history',
    get: (id: string) => `/calls/${id}`,
    initiate: '/calls/initiate',
    join: (id: string) => `/calls/${id}/join`,
    end: (id: string) => `/calls/${id}/end`,
    decline: (id: string) => `/calls/${id}/decline`,
    toggleMedia: (id: string) => `/calls/${id}/media`,
    toggleAudio: (id: string) => `/calls/${id}/audio`,
    toggleVideo: (id: string) => `/calls/${id}/video`,
    token: (id: string) => `/calls/${id}/token`,
    rate: (id: string) => `/calls/${id}/rate`,
  },
};

