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

// Component to handle auto-logout when app is opened
function AuthStateHandler() {
  const { isSignedIn, signOut } = useAuth();
  const appState = useRef(AppState.currentState);
  const appStartTime = useRef(Date.now());
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Only clear SecureStore on initial app start (first mount)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      clearClerkSecureStore();
    }

    // Handle app state changes - only sign out when app comes back from background/killed
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Only sign out when app transitions from background/inactive to active
      // AND app was in background for more than 1 second (to avoid sign out during normal app switching)
      const wasInBackground = appState.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (wasInBackground && isNowActive && isSignedIn) {
        // App was reopened from background/killed state - clear and sign out
        // This ensures user must login again when they reopen the app
        clearClerkSecureStore().then(() => {
          signOut().catch((err) => {
            console.warn('Auto-signout on app resume:', err);
          });
        });
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isSignedIn, signOut]);

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
