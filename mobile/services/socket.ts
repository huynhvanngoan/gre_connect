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
  
  // Nếu đã có socket và đang connected, chỉ update token nếu cần
  if (socket && socket.connected) {
    if (token && currentToken !== token) {
      // Update auth token without reconnecting
      socket.auth = { token };
    }
    return socket;
  }

  // Nếu đã có socket nhưng chưa connected, đợi hoặc tái sử dụng
  if (socket && !socket.connected) {
    // Đợi socket connect hoặc tạo mới sau timeout
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (socket && socket.connected) {
          resolve(socket);
        } else {
          // Tạo socket mới nếu timeout
          socket = io(serverUrl, {
            transports: ['websocket'],
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5, // Giới hạn số lần reconnect
            reconnectionDelay: 2000, // Tăng delay lên 2 giây
            reconnectionDelayMax: 10000, // Max delay 10 giây
            timeout: 10000,
            auth: currentToken ? { token: currentToken } : undefined,
          });
          resolve(socket);
        }
        clearTimeout(timeout);
      }, 1000);
    });
  }

  // Tạo socket mới
  socket = io(serverUrl, {
    transports: ['websocket'],
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: 5, // Giới hạn số lần reconnect
    reconnectionDelay: 2000, // Tăng delay lên 2 giây
    reconnectionDelayMax: 10000, // Max delay 10 giây
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
    // Update auth token without reconnecting
    socket.auth = { token };
    // Chỉ reconnect nếu socket chưa connected
    if (!socket.connected) {
      socket.connect();
    }
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


