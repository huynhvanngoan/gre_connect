import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
// Note: getToken needs to be called from component context, 
// so we'll accept token as parameter or use it from components

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Token will be passed from components that call getToken()
  // or set via setAuthToken method
  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private getAuthToken(): string | null {
    return this.authToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Use Record<string, string> for better TypeScript support
      const isFormData = (
        (typeof FormData !== 'undefined' && options.body instanceof FormData) ||
        // React Native FormData polyfill check
        (options.body && typeof options.body === 'object' && (options.body as any)._parts)
      );
      const headers: Record<string, string> = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers as Record<string, string> || {}),
      };

      // Add authentication token if available
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log(`[API] ${options.method || 'GET'} ${endpoint} - Token: ${token.substring(0, 20)}...`);
      } else {
        console.warn(`[API] No auth token available for ${options.method || 'GET'} ${endpoint}`);
      }

      const url = `${this.baseURL}${endpoint}`;
      console.log(`[API] ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        // Log detailed error for debugging
        console.error('[API Error Response]', {
          status: response.status,
          statusText: response.statusText,
          data,
          endpoint,
        });
        
        // Extract validation errors if present
        const errors = data.errors || data.error || [];
        const errorMessage = Array.isArray(errors) 
          ? errors.map((e: any) => e.msg || e.message || e).join(', ')
          : (data.message || data.error || `HTTP ${response.status}`);
        
        return {
          success: false,
          error: errorMessage,
          message: data.message || errorMessage,
          data: data.errors || data, // Include full error details for debugging
        };
      }

      // Backend trả về { success, data, message } hoặc trực tiếp data
      return {
        success: true,
        data: data.data !== undefined ? data.data : (Array.isArray(data) ? data : data),
        message: data.message,
      };
    } catch (error: any) {
      console.error('[API Error]', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth APIs
  async syncUser(role?: string) {
    return this.post(API_ENDPOINTS.auth.sync, { role });
  }

  async checkAuth() {
    return this.get(API_ENDPOINTS.auth.check);
  }

  // Posts APIs
  async getPosts(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    const response = await this.get<{ posts: any[], pagination: any }>(
      API_ENDPOINTS.posts.list + (query ? `?${query}` : '')
    );
    
    // Extract posts array from response
    if (response.success && response.data) {
      const posts = Array.isArray(response.data.posts) 
        ? response.data.posts 
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: posts };
    }
    
    return { ...response, data: [] };
  }

  async searchPosts(query: string, params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams({ q: query });
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const response = await this.get<{ posts: any[], pagination: any }>(
      API_ENDPOINTS.posts.search + `?${queryParams.toString()}`
    );
    
    // Extract posts array from response
    if (response.success && response.data) {
      const posts = Array.isArray(response.data.posts) 
        ? response.data.posts 
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: posts };
    }
    
    return { ...response, data: [] };
  }

  async getTrendingPosts(params?: { limit?: number; days?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.days) queryParams.append('days', params.days.toString());
    
    const query = queryParams.toString();
    const response = await this.get<{ posts: any[] }>(
      API_ENDPOINTS.posts.trending + (query ? `?${query}` : '')
    );
    
    // Extract posts array from response
    if (response.success && response.data) {
      const posts = Array.isArray(response.data.posts) 
        ? response.data.posts 
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: posts };
    }
    
    return { ...response, data: [] };
  }

  async getRecentPosts(params?: { limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    queryParams.append('sortBy', 'createdAt');
    queryParams.append('order', 'desc');
    
    const query = queryParams.toString();
    const response = await this.get<{ posts: any[], pagination: any }>(
      API_ENDPOINTS.posts.list + (query ? `?${query}` : '')
    );
    
    // Extract posts array from response
    if (response.success && response.data) {
      const posts = Array.isArray(response.data.posts) 
        ? response.data.posts 
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: posts };
    }
    
    return { ...response, data: [] };
  }

  async getPost(id: string) {
    const response = await this.get<{ post: any } | any>(API_ENDPOINTS.posts.get(id));
    if (response.success && response.data) {
      const post = (response.data as any).post ?? response.data;
      return { ...response, data: post };
    }
    return response;
  }

  async getTrendingTopics(params?: { limit?: number; days?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.days) queryParams.append('days', params.days.toString());

    const query = queryParams.toString();
    return this.get<{ topics: Array<{ topic: string; count: number; postsCount: number }> }>(
      API_ENDPOINTS.posts.trendingTopics + (query ? `?${query}` : '')
    );
  }

  /**
   * Create a new post
   * @param postData - Post data (content is required, other fields are optional)
   */
  async createPost(postData: {
    content: string;
    postType?: string;
    visibility?: string;
    tags?: string[];
    targetClass?: string;
    allowComments?: boolean;
    allowLikes?: boolean;
    allowSharing?: boolean;
  }) {
    return this.post(API_ENDPOINTS.posts.list, postData);
  }

  /**
   * Like or unlike a post
   * @param postId - Post ID
   */
  async toggleLikePost(postId: string) {
    return this.post(API_ENDPOINTS.posts.like(postId), {});
  }

  /**
   * Share a post
   * @param postId - Post ID
   */
  async sharePost(postId: string) {
    return this.post(API_ENDPOINTS.posts.share(postId), {});
  }

  // Comments APIs
  async getComments(postId: string, params?: { limit?: number; page?: number; sortBy?: 'createdAt' | 'likesCount' | 'repliesCount'; order?: 'asc' | 'desc' }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.order) queryParams.append('order', params.order);
    const query = queryParams.toString();
    const response = await this.get<{ comments: any[]; pagination?: any }>(
      API_ENDPOINTS.comments.list(postId) + (query ? `?${query}` : '')
    );
    if (response.success && response.data) {
      const comments = Array.isArray((response.data as any).comments)
        ? (response.data as any).comments
        : (Array.isArray(response.data) ? (response.data as any) : []);
      return { ...response, data: comments };
    }
    return { ...response, data: [] };
  }

  async getReplies(commentId: string, params?: { limit?: number; page?: number; sortBy?: 'createdAt' | 'likesCount'; order?: 'asc' | 'desc' }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.order) queryParams.append('order', params.order);
    const query = queryParams.toString();
    const response = await this.get<{ replies: any[] }>(
      API_ENDPOINTS.comments.list(commentId) + '/replies' + (query ? `?${query}` : '')
    );
    if (response.success && response.data) {
      const replies = Array.isArray((response.data as any).replies)
        ? (response.data as any).replies
        : (Array.isArray(response.data) ? (response.data as any) : []);
      return { ...response, data: replies };
    }
    return { ...response, data: [] };
  }

  async addComment(postId: string, data: { content: string; mediaUri?: string; mediaType?: string; mediaName?: string; parentCommentId?: string }) {
    const form = new FormData();
    form.append('content', data.content);
    if (data.parentCommentId) {
      form.append('parentComment', data.parentCommentId);
    }
    if (data.mediaUri) {
      // React Native FormData file
      const type = data.mediaType || 'application/octet-stream';
      // infer an extension for better server-side handling
      const defaultName = type.includes('pdf') ? 'upload.pdf' : type.includes('word') ? 'upload.docx' : type.startsWith('image/') ? 'upload.jpg' : type.startsWith('video/') ? 'upload.mp4' : 'attachment.bin';
      form.append('media' as any, {
        uri: data.mediaUri as any,
        name: (data.mediaName || defaultName) as any,
        type: type as any,
      } as any);
    }
    return this.request(API_ENDPOINTS.comments.create(postId), {
      method: 'POST',
      body: form as any,
    });
  }

  async likeComment(commentId: string) {
    return this.post(API_ENDPOINTS.comments.like(commentId), {});
  }

  async updateComment(commentId: string, data: { content: string }) {
    return this.put(API_ENDPOINTS.comments.update(commentId), data);
  }

  async deleteComment(commentId: string) {
    return this.delete(API_ENDPOINTS.comments.delete(commentId));
  }

  // Users APIs
  async searchUsers(query: string, params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams({ q: query });
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const response = await this.get<{ data: any[], pagination: any }>(
      API_ENDPOINTS.users.search + `?${queryParams.toString()}`
    );
    
    // Extract users array from response
    if (response.success && response.data) {
      const users = Array.isArray(response.data.data) 
        ? response.data.data 
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: users };
    }
    
    return { ...response, data: [] };
  }

  async getUserProfile(identifier: string) {
    return this.get(API_ENDPOINTS.users.profile(identifier));
  }

  async getCurrentUser() {
    const response = await this.get(API_ENDPOINTS.users.me);
    return response;
  }

  // Conversations APIs
  async getConversations(params?: { type?: string; limit?: number; skip?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    
    const query = queryParams.toString();
    const response = await this.get<{ conversations: any[], pagination?: any }>(
      API_ENDPOINTS.conversations.list + (query ? `?${query}` : '')
    );
    
    // Extract conversations array from response
    if (response.success && response.data) {
      const conversations = Array.isArray(response.data.conversations) 
        ? response.data.conversations 
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: conversations };
    }
    
    return { ...response, data: [] };
  }

  async getConversation(id: string) {
    return this.get(API_ENDPOINTS.conversations.get(id));
  }

  async searchConversations(query: string, params?: { limit?: number }) {
    const queryParams = new URLSearchParams({ q: query });
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return this.get(
      API_ENDPOINTS.conversations.search + `?${queryParams.toString()}`
    );
  }

  /**
   * Create direct conversation with another user
   * Backend automatically sets type = "direct"
   */
  async createDirectConversation(userId: string) {
    return this.post(API_ENDPOINTS.conversations.createDirect, { userId });
  }

  /**
   * Create group conversation
   * Backend automatically sets type = "group"
   * @param name - Group name (required)
   * @param participantIds - Array of user IDs to add (required)
   * @param avatar - Optional group avatar URL
   * @param description - Optional group description
   */
  async createGroupConversation(data: {
    name: string;
    participantIds: string[];
    avatar?: string;
    description?: string;
  }) {
    return this.post(API_ENDPOINTS.conversations.createGroup, data);
  }

  /**
   * Note: Class conversations are automatically created by backend
   * when a Class is created (via Class model's post('save') middleware)
   * No need to create them manually
   */

  // Messages APIs
  async getMessages(conversationId: string, params?: { limit?: number; before?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.before) queryParams.append('before', params.before);
    
    const query = queryParams.toString();
    const response = await this.get<{ messages: any[], pagination?: any }>(
      API_ENDPOINTS.messages.list(conversationId) + (query ? `?${query}` : '')
    );
    
    // Extract messages array from response
    if (response.success && response.data) {
      const messages = Array.isArray(response.data.messages) 
        ? response.data.messages 
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: messages };
    }
    
    return { ...response, data: [] };
  }

  async sendMessage(conversationId: string, content: string, options?: { attachments?: any[] }) {
    return this.post(API_ENDPOINTS.messages.send(conversationId), {
      content,
      ...options,
    });
  }

  async sendMessageForm(conversationId: string, data: { content?: string; fileUri: string; mimeType?: string; fileName?: string }) {
    const form = new FormData();
    if (data.content) form.append('content', data.content);
    form.append('attachments' as any, {
      uri: data.fileUri as any,
      name: (data.fileName || 'attachment') as any,
      type: (data.mimeType || 'application/octet-stream') as any,
    } as any);
    return this.request(API_ENDPOINTS.messages.send(conversationId), {
      method: 'POST',
      body: form as any,
    });
  }

  async sendMessageFormMulti(
    conversationId: string,
    data: { content?: string; files: { uri: string; mimeType?: string; fileName?: string }[] }
  ) {
    const form = new FormData();
    if (data.content) form.append('content', data.content);
    for (const f of data.files) {
      form.append('attachments' as any, {
        uri: f.uri as any,
        name: (f.fileName || 'attachment') as any,
        type: (f.mimeType || 'application/octet-stream') as any,
      } as any);
    }
    return this.request(API_ENDPOINTS.messages.send(conversationId), {
      method: 'POST',
      body: form as any,
    });
  }

  // Read receipts
  async markMessageRead(messageId: string) {
    return this.post(API_ENDPOINTS.messages.markRead(messageId), {});
  }

  async markAllMessagesRead(conversationId: string) {
    return this.post(API_ENDPOINTS.messages.markAllRead(conversationId), {});
  }

  // Notifications APIs
  async getNotifications(params?: { type?: string; limit?: number; skip?: number; read?: boolean }) {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.read !== undefined) queryParams.append('read', params.read.toString());

    const query = queryParams.toString();
    const response = await this.get<{ notifications: any[], pagination?: any }>(
      API_ENDPOINTS.notifications.list + (query ? `?${query}` : '')
    );

    if (response.success && response.data) {
      const notifications = Array.isArray(response.data.notifications)
        ? response.data.notifications
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: notifications };
    }

    return { ...response, data: [] };
  }

  async getUnreadNotifications(params?: { limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    
    const response = await this.get<{ notifications: any[] }>(
      API_ENDPOINTS.notifications.unread + (query ? `?${query}` : '')
    );

    if (response.success && response.data) {
      const notifications = Array.isArray(response.data.notifications)
        ? response.data.notifications
        : (Array.isArray(response.data) ? response.data : []);
      return { ...response, data: notifications };
    }

    return { ...response, data: [] };
  }

  async getUnreadNotificationsCount() {
    const response = await this.get<{ count: number }>(API_ENDPOINTS.notifications.unreadCount);
    return response;
  }

  async markNotificationRead(notificationId: string) {
    return this.put(API_ENDPOINTS.notifications.markRead(notificationId), {});
  }

  async markAllNotificationsRead() {
    return this.put(API_ENDPOINTS.notifications.markAllRead, {});
  }

  async dismissNotification(notificationId: string) {
    return this.delete(API_ENDPOINTS.notifications.dismiss(notificationId));
  }

  async dismissAllNotifications() {
    return this.delete(API_ENDPOINTS.notifications.dismissAll);
  }

  async getNotificationPreferences() {
    return this.get(API_ENDPOINTS.notifications.preferences);
  }

  async updateNotificationPreferences(preferences: any) {
    return this.put(API_ENDPOINTS.notifications.preferences, preferences);
  }
}

export const apiService = new ApiService();

