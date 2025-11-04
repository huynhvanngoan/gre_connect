import { useApi } from './useApi';
import { useAuth } from '@clerk/clerk-expo';
import { apiService } from '@/services/api';

export const useProfile = () => {
    const { userId: clerkUserId } = useAuth();

    const { data: user, loading, error, refetch } = useApi(
        () => apiService.getCurrentUser(),
        [],
        { enabled: !!clerkUserId }
    );

    return {
        user: user as any,
        loading,
        error,
        refetch,
    };
};

