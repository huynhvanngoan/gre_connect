import { useState } from 'react';
import { useApi } from './useApi';
import { apiService } from '@/services/api';
import { useAuth } from '@clerk/clerk-expo';

export const useComments = (postId?: string) => {
  const [submitting, setSubmitting] = useState(false);
  const { getToken } = useAuth();
  const [sortBy, setSortBy] = useState<'createdAt' | 'likesCount' | 'repliesCount'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [repliesMap, setRepliesMap] = useState<Record<string, any[]>>({});
  const [replyTo, setReplyTo] = useState<any | null>(null);

  const { data: comments, loading, error, refetch } = useApi(
    () => apiService.getComments(postId as string, { limit: 50, sortBy, order }),
    [postId, sortBy, order],
    { enabled: !!postId }
  );

  const addComment = async (content: string, mediaUri?: string, mediaType?: string, mediaName?: string) => {
    if (!postId || !content.trim()) return;
    setSubmitting(true);
    try {
      // Ensure we use a fresh token before posting a protected endpoint
      try {
        const token = await getToken?.();
        if (token) apiService.setAuthToken(token);
      } catch {}

      await apiService.addComment(postId, { content, mediaUri, mediaType, mediaName, parentCommentId: replyTo?._id });
      await refetch();
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const editComment = async (commentId: string, content: string) => {
    if (!commentId || !content.trim()) return;
    try {
      const token = await getToken?.();
      if (token) apiService.setAuthToken(token);
    } catch {}
    await apiService.updateComment(commentId, { content });
    await refetch();
  };

  const deleteComment = async (commentId: string) => {
    if (!commentId) return;
    try {
      const token = await getToken?.();
      if (token) apiService.setAuthToken(token);
    } catch {}
    await apiService.deleteComment(commentId);
    await refetch();
  };

  const likeComment = async (commentId: string) => {
    try {
      const token = await getToken?.();
      if (token) apiService.setAuthToken(token);
    } catch {}
    await apiService.likeComment(commentId);
    await refetch();
  };

  const loadReplies = async (commentId: string) => {
    const res = await apiService.getReplies(commentId, { limit: 20, sortBy: 'createdAt', order: 'asc' });
    if (res.success) {
      const list = Array.isArray(res.data) ? res.data : [];
      setRepliesMap(prev => ({ ...prev, [commentId]: list }));
    }
  };

  return {
    comments: Array.isArray(comments) ? comments : [],
    loading,
    error,
    submitting,
    refetch,
    addComment,
    replyTo,
    setReplyTo,
    // filters
    sortBy,
    order,
    setSortBy,
    setOrder,
    // interactions
    likeComment,
    // replies
    loadReplies,
    repliesMap,
    editComment,
    deleteComment,
  };
};


