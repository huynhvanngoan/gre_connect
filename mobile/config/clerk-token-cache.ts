// Custom token cache that does NOT persist tokens
// This ensures users must login every time they open the app

// Define TokenCache interface
interface TokenCache {
  getToken(key: string): Promise<string | null>;
  saveToken(key: string, token: string): Promise<void>;
  clearToken(key: string): Promise<void>;
  clearAllTokens(): Promise<void>;
}

// In-memory cache only (no persistence)
const memoryCache = new Map<string, { token: string; expiresAt: number }>();

export const noPersistTokenCache: TokenCache = {
  async getToken(key: string): Promise<string | null> {
    const cached = memoryCache.get(key);
    if (!cached) return null;
    
    // Check if token is expired
    if (Date.now() >= cached.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    
    return cached.token;
  },

  async saveToken(key: string, token: string): Promise<void> {
    // Only save to memory, not to SecureStore
    // Tokens will be lost when app is closed
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour default
    memoryCache.set(key, { token, expiresAt });
  },

  async clearToken(key: string): Promise<void> {
    memoryCache.delete(key);
  },

  async clearAllTokens(): Promise<void> {
    memoryCache.clear();
  },
};

