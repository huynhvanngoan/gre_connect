import { useSSO, useAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { Alert } from "react-native";
import { apiService } from "@/services/api";



export const useSocialAuth = () => {
    const [isLoading, setIsLoading ] = useState(false);
    const { startSSOFlow } = useSSO();
    const { getToken } = useAuth();


    const handleSocialAuth =  async (strategy: "oauth_google" | "oauth_apple") => {
        setIsLoading(true);
        try {
            const { createdSessionId, setActive } = await startSSOFlow({ strategy});
            if(createdSessionId && setActive) {
                await setActive({ session: createdSessionId});
                
                // Sync user to backend after successful Clerk authentication
                try {
                    // Wait a bit for token to be ready
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const token = await getToken();
                    if (token) {
                        // Set token in API service
                        apiService.setAuthToken(token);
                        
                        console.log("🔄 Syncing user to backend...");
                        const syncResponse = await apiService.syncUser();
                        
                        if (syncResponse.success) {
                            const syncData = syncResponse.data as { isNewUser?: boolean; user?: any } | undefined;
                            console.log("✅ User synced successfully:", syncData?.isNewUser ? "New user" : "Existing user");
                        } else {
                            console.warn("⚠️ Sync failed (non-critical):", syncResponse.error);
                        }
                    }
                } catch (syncError) {
                    // Don't block auth flow if sync fails
                    console.warn("⚠️ Failed to sync user (non-critical):", syncError);
                }
            }
        } catch (error) {
            console.log("Error in social auth", error);
            const provider = strategy === "oauth_google" ? "Google" : "Apple";
            Alert.alert("Error", `Failed to sign in with ${provider}. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    }



    return {isLoading, handleSocialAuth}
}