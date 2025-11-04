import { useApi } from './useApi';
import { apiService } from '@/services/api';

export const usePostDetail = (postId?: string) => {
  const { data: post, loading, error, refetch } = useApi(
    () => apiService.getPost(postId as string),
    [postId],
    { enabled: !!postId }
  );

  return {
    post,
    loading,
    error,
    refetch,
  };
};


