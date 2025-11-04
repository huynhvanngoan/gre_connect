import { useState } from 'react';
import { apiService } from '@/services/api';
import { useApi } from './useApi';

export const useSearch = () => {
    const [searchText, setSearchText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Search posts
    const { 
        data: posts, 
        loading: postsLoading, 
        refetch: refetchPosts 
    } = useApi(
        () => apiService.searchPosts(searchQuery, { limit: 10 }),
        [searchQuery],
        { enabled: !!searchQuery }
    );

    // Search users
    const { 
        data: users, 
        loading: usersLoading, 
        refetch: refetchUsers 
    } = useApi(
        () => apiService.searchUsers(searchQuery, { limit: 10 }),
        [searchQuery],
        { enabled: !!searchQuery }
    );

    // Trending topics
    const { data: topicsData } = useApi(
        () => apiService.getTrendingTopics({ limit: 15 }),
        [],
        { enabled: !searchQuery }
    );

    // Recent posts
    const { data: recentPosts } = useApi(
        () => apiService.getRecentPosts({ limit: 10 }),
        [],
        { enabled: !searchQuery }
    );

    // Hot/Trending posts
    const { data: hotPosts } = useApi(
        () => apiService.getTrendingPosts({ limit: 10, days: 7 }),
        [],
        { enabled: !searchQuery }
    );

    const trendingTopics = topicsData?.topics || [];

    const handleSearch = () => {
        const query = searchText.trim();
        if (query) {
            setSearchQuery(query);
        } else {
            setSearchQuery("");
        }
    };

    const clearSearch = () => {
        setSearchText("");
        setSearchQuery("");
    };

    return {
        // State
        searchText,
        setSearchText,
        searchQuery,
        setSearchQuery,
        
        // Search results
        posts: Array.isArray(posts) ? posts : [],
        users: Array.isArray(users) ? users : [],
        postsLoading,
        usersLoading,
        
        // Discover content
        trendingTopics,
        recentPosts: Array.isArray(recentPosts) ? recentPosts : [],
        hotPosts: Array.isArray(hotPosts) ? hotPosts : [],
        
        // Actions
        handleSearch,
        clearSearch,
        refetchPosts,
        refetchUsers,
    };
};

