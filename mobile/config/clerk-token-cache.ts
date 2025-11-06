// Custom token cache that persists tokens for 30 minutes
// If app is closed for more than 30 minutes, user must login again

import * as SecureStore from 'expo-secure-store';

// Define TokenCache interface
interface TokenCache {
  getToken(key: string): Promise<string | null>;
  saveToken(key: string, token: string): Promise<void>;
  clearToken(key: string): Promise<void>;
  clearAllTokens(): Promise<void>;
}

// 30 minutes in milliseconds
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// Store token with timestamp prefix
const getTimestampKey = (key: string) => `${key}_timestamp`;
const getTokenKey = (key: string) => `${key}_token`;

// Helper function to clear a single token
const clearTokenHelper = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(getTokenKey(key));
    await SecureStore.deleteItemAsync(getTimestampKey(key));
  } catch (error) {
    console.warn('Error clearing token from cache:', error);
  }
};

export const noPersistTokenCache: TokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      // Get token and timestamp from SecureStore
      const token = await SecureStore.getItemAsync(getTokenKey(key));
      const timestampStr = await SecureStore.getItemAsync(getTimestampKey(key));

      if (!token || !timestampStr) {
        return null;
      }

      // Check if token is expired (more than 30 minutes)
      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      const elapsed = now - timestamp;

      if (elapsed > TOKEN_EXPIRY_MS) {
        // Token expired, clear it
        await clearTokenHelper(key);
        return null;
      }

      return token;
    } catch (error) {
      console.warn('Error getting token from cache:', error);
      return null;
    }
  },

  async saveToken(key: string, token: string): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      
      // Save both token and timestamp to SecureStore
      await SecureStore.setItemAsync(getTokenKey(key), token);
      await SecureStore.setItemAsync(getTimestampKey(key), timestamp);
    } catch (error) {
      console.warn('Error saving token to cache:', error);
    }
  },

  async clearToken(key: string): Promise<void> {
    await clearTokenHelper(key);
  },

  async clearAllTokens(): Promise<void> {
    try {
      // Clear common Clerk token keys
      const keys = [
        '__clerk_db_jwt',
        '__clerk_client_jwt',
        '__clerk_db_jwt_development',
        '__clerk_client_jwt_development',
        'clerk_token',
        'clerk_session',
      ];

      for (const key of keys) {
        await clearTokenHelper(key);
      }
    } catch (error) {
      console.warn('Error clearing all tokens:', error);
    }
  },
};

