import { useState } from 'react';
import { apiService } from '@/services/api';
import { useApi } from './useApi';

export const useHomeFeed = () => {
    const [refreshing, setRefreshing] = useState(false);

    const { data: posts, loading, error, refetch } = useApi(
        () => apiService.getPosts({ limit: 20 }),
        []
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return {
        posts: Array.isArray(posts) ? posts : [],
        loading,
        error,
        refreshing,
        onRefresh,
        refetch,
    };
};

