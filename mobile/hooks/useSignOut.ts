import { useClerk } from "@clerk/clerk-expo";
import { Alert } from "react-native";
import { apiService } from "@/services/api";
import { disconnectSocket } from "@/services/socket";

export const useSignOut = () => {
    const { signOut } = useClerk();

    const handleSignOut = async () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    try {
                        // 1. Call backend logout to clear cache
                        await apiService.logout();
                        
                        // 2. Disconnect socket
                        disconnectSocket();
                        
                        // 3. Clear Clerk session (this will clear Clerk token cache)
                        await signOut();
                    } catch (error) {
                        console.error("Logout error:", error);
                        // Even if there's an error, still try to sign out from Clerk
                        try {
                            await signOut();
                        } catch (clerkError) {
                            console.error("Clerk signOut error:", clerkError);
                        }
                    }
                },
            },
        ]);
    };

    return { handleSignOut };
};