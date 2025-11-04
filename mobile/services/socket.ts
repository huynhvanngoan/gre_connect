import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api';

let socket: Socket | null = null;
let currentToken: string | null = null;

const getSocketServerUrl = () => {
  // Expect API_BASE_URL like http://host:port/api/v1 → strip /api/v1
  try {
    const url = new URL(API_BASE_URL);
    const base = `${url.protocol}//${url.host}`;
    return base; // socket.io server assumed at same host
  } catch {
    // Fallback: remove trailing /api/v1
    return API_BASE_URL.replace(/\/api\/(v\d+)?$/, '');
  }
};

export async function initSocket(token?: string) {
  const serverUrl = getSocketServerUrl();
  if (token) currentToken = token;
  if (socket && socket.connected) return socket;

  socket = io(serverUrl, {
    transports: ['websocket'],
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    timeout: 10000,
    auth: currentToken ? { token: currentToken } : undefined,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function setSocketAuthToken(token: string) {
  currentToken = token;
  if (socket) {
    // socket.io v4 supports dynamic auth update via connect with new instance; for simplicity, disconnect/reconnect
    if (socket.connected) socket.disconnect();
    initSocket(token);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ============================================
// CONVERSATION ROOM MANAGEMENT
// ============================================

export function joinConversationRoom(conversationId: string) {
  if (socket && socket.connected) {
    socket.emit('join-conversation', conversationId);
  }
}

export function leaveConversationRoom(conversationId: string) {
  if (socket && socket.connected) {
    socket.emit('leave-conversation', conversationId);
  }
}

// ============================================
// TYPING INDICATORS
// ============================================

let typingTimeout: number | null = null;
const TYPING_TIMEOUT_MS = 3000; // Stop typing after 3s of inactivity

export function sendTypingStatus(conversationId: string, isTyping: boolean) {
  if (socket && socket.connected) {
    socket.emit('user-typing', {
      conversationId,
      isTyping,
    });
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
    
    // Auto-stop typing after timeout (only if starting to type)
    if (isTyping) {
      typingTimeout = setTimeout(() => {
        if (socket && socket.connected) {
          socket.emit('user-typing', {
            conversationId,
            isTyping: false,
          });
        }
      }, TYPING_TIMEOUT_MS);
    }
  }
}

// ============================================
// NOTIFICATIONS
// ============================================

export function onNotification(callback: (notification: any) => void) {
  if (socket) {
    socket.on('notification', callback);
    return () => socket?.off('notification', callback);
  }
  return () => {};
}


