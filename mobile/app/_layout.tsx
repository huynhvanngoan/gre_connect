import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { noPersistTokenCache } from "@/config/clerk-token-cache";
import "../global.css";

// Clear all Clerk-related data from SecureStore
async function clearClerkSecureStore() {
  try {
    // Clerk stores tokens with keys like: clerk_token, clerk_session, etc.
    const keys = [
      'clerk_token',
      'clerk_session',
      '__clerk_db_jwt',
      '__clerk_client_jwt',
      '__clerk_db_jwt_development',
      '__clerk_client_jwt_development',
    ];

    for (const key of keys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (err) {
        // Ignore errors if key doesn't exist
      }
    }
  } catch (error) {
    console.warn('Error clearing SecureStore:', error);
  }
}

// Component to handle auto-logout when token expires (30 minutes)
function AuthStateHandler() {
  const { isSignedIn, signOut, getToken } = useAuth();
  const appState = useRef(AppState.currentState);
  const isInitialMount = useRef(true);
  const lastCheckTime = useRef<number | null>(null);

  // Check if token is expired (more than 30 minutes)
  const checkTokenExpiry = async () => {
    try {
      // Try to get token - if it's expired, getToken will return null
      const token = await getToken?.({ skipCache: false });
      
      if (!token && isSignedIn) {
        // Token expired, sign out
        await clearClerkSecureStore();
        await signOut();
      } else {
        // Update last check time
        lastCheckTime.current = Date.now();
      }
    } catch (error) {
      console.warn('Error checking token expiry:', error);
    }
  };

  useEffect(() => {
    // Check token expiry on initial mount
    if (isInitialMount.current && isSignedIn) {
      isInitialMount.current = false;
      checkTokenExpiry();
    }

    // Handle app state changes - check token expiry when app comes back from background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasInBackground = appState.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      // When app becomes active from background, check if token is still valid
      if (wasInBackground && isNowActive && isSignedIn) {
        checkTokenExpiry();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isSignedIn, signOut, getToken]);

  return null;
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={noPersistTokenCache}>
      <AuthStateHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false }}
        />
      </Stack>
    </ClerkProvider>
  );
}
