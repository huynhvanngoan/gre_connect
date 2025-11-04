import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { useApi } from './useApi';
import { useAuth } from '@clerk/clerk-expo';

export type ConversationType = 'direct' | 'group' | 'class' | 'all';

export const useConversations = (type: ConversationType = 'all') => {
    const [searchText, setSearchText] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const { userId: clerkUserId } = useAuth();

    // Get current user's database ID
    const { data: currentUser } = useApi(
        () => apiService.getCurrentUser(),
        [],
        { enabled: !!clerkUserId }
    );

    const currentUserId = (currentUser as any)?._id || null;

    // Build query params based on type
    const buildQuery = () => {
        const params: any = { limit: 50 };
        if (type !== 'all') {
            params.type = type;
        }
        return params;
    };

    const { 
        data: conversations, 
        loading, 
        error, 
        refetch 
    } = useApi(
        () => apiService.getConversations(buildQuery()),
        [type],
        { enabled: true }
    );

    const conversationsList = Array.isArray(conversations) ? conversations : [];

    // Filter by search text
    const filteredConversations = searchText.trim() 
        ? conversationsList.filter((conv: any) => {
            const searchLower = searchText.toLowerCase();
            return (
                conv.name?.toLowerCase().includes(searchLower) ||
                conv.participants?.some((p: any) => 
                    p.user?.firstName?.toLowerCase().includes(searchLower) ||
                    p.user?.lastName?.toLowerCase().includes(searchLower) ||
                    p.user?.username?.toLowerCase().includes(searchLower)
                )
            );
        })
        : conversationsList;

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return {
        conversations: filteredConversations,
        loading,
        error,
        refreshing,
        searchText,
        setSearchText,
        onRefresh,
        refetch,
        currentUserId, // Export current user ID for use in components
    };
};

