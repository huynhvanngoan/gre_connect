import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { apiService } from '@/services/api';

/**
 * Component to automatically sync user when authenticated
 * Add this to your root layout or main app component
 */
export default function AutoSyncUser() {
  const { isSignedIn, userId, getToken } = useAuth();

  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !userId) return;

      try {
        // getToken is available from useAuth hook
        const token = await getToken();

        if (!token) {
          console.log('[AutoSync] No token available');
          return;
        }

        // Set token in API service
        apiService.setAuthToken(token);

        console.log('[AutoSync] Syncing user to backend...');
        const response = await apiService.syncUser();

        if (response.success) {
          const syncData = response.data as { isNewUser?: boolean; user?: any } | undefined;
          console.log('[AutoSync] ✅ User synced:', syncData?.isNewUser ? 'New user created' : 'Existing user updated');
        } else {
          console.warn('[AutoSync] ⚠️ Sync failed:', response.error);
        }
      } catch (error: any) {
        console.error('[AutoSync] Error:', error.message || error);
      }
    };

    // Sync when user becomes authenticated
    syncUser();
  }, [isSignedIn, userId, getToken]);

  return null; // This component doesn't render anything
}

