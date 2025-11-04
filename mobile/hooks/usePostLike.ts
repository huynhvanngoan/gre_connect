import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { apiService } from '@/services/api';
import { Post } from '@/types/common';

interface UsePostLikeOptions {
    currentUserId: string | null;
    onUpdatePosts: (updater: (posts: Post[]) => Post[]) => void;
}

interface UsePostLikeReturn {
    likingPosts: Record<string, boolean>;
    handleLikePost: (post: Post) => Promise<void>;
}

export const usePostLike = ({
    currentUserId,
    onUpdatePosts,
}: UsePostLikeOptions): UsePostLikeReturn => {
    const { getToken } = useAuth();
    const [likingPosts, setLikingPosts] = useState<Record<string, boolean>>({});

    const handleLikePost = useCallback(async (post: Post) => {
        if (!post._id) return;

        const postId = post._id.toString();
        if (likingPosts[postId]) return; // Prevent double-click

        setLikingPosts(prev => ({ ...prev, [postId]: true }));

        // Optimistic update - calculate new state
        const currentIsLiked = post.isLiked !== undefined
            ? post.isLiked
            : Boolean(currentUserId && post.likes?.some((likeId: any) =>
                likeId?.toString() === currentUserId?.toString()
            ));

        const newIsLiked = !currentIsLiked;
        const currentLikesCount = post.likes?.length || post.likesCount || 0;
        const newLikesCount = newIsLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1);

        // Store original state for revert
        const originalPost = { ...post };

        // Optimistic update - update UI immediately
        onUpdatePosts(prevPosts =>
            prevPosts.map(p => {
                if (p._id?.toString() === postId) {
                    return {
                        ...p,
                        isLiked: newIsLiked,
                        likesCount: newLikesCount,
                        likes: newIsLiked
                            ? [...(p.likes || []), currentUserId].filter(Boolean)
                            : (p.likes || []).filter((id: any) => id?.toString() !== currentUserId?.toString())
                    };
                }
                return p;
            })
        );

        try {
            // Get token
            const token = await getToken?.();
            if (!token) {
                // Revert optimistic update
                onUpdatePosts(prevPosts =>
                    prevPosts.map(p => {
                        if (p._id?.toString() === postId) {
                            return {
                                ...p,
                                isLiked: currentIsLiked,
                                likesCount: currentLikesCount,
                                likes: originalPost.likes
                            };
                        }
                        return p;
                    })
                );
                Alert.alert('Authentication Required', 'Please log in to like posts.');
                setLikingPosts(prev => {
                    const newState = { ...prev };
                    delete newState[postId];
                    return newState;
                });
                return;
            }

            // Set token before API call
            apiService.setAuthToken(token);

            const response = await apiService.toggleLikePost(postId);

            if (response.success) {
                // Update with server response
                const responseData = response.data as any;
                const serverLiked = responseData?.liked ?? newIsLiked;
                const serverLikesCount = responseData?.likesCount ?? newLikesCount;

                onUpdatePosts(prevPosts =>
                    prevPosts.map(p => {
                        if (p._id?.toString() === postId) {
                            return {
                                ...p,
                                isLiked: serverLiked,
                                likesCount: serverLikesCount,
                            };
                        }
                        return p;
                    })
                );
            } else {
                // Revert optimistic update on error
                onUpdatePosts(prevPosts =>
                    prevPosts.map(p => {
                        if (p._id?.toString() === postId) {
                            return {
                                ...p,
                                isLiked: currentIsLiked,
                                likesCount: currentLikesCount,
                                likes: originalPost.likes
                            };
                        }
                        return p;
                    })
                );
                console.error('[usePostLike] API Error:', response);
                Alert.alert('Error', response.error || response.message || 'Failed to like post');
            }
        } catch (error: any) {
            // Revert optimistic update on exception
            onUpdatePosts(prevPosts =>
                prevPosts.map(p => {
                    if (p._id?.toString() === postId) {
                        return {
                            ...p,
                            isLiked: currentIsLiked,
                            likesCount: currentLikesCount,
                            likes: originalPost.likes
                        };
                    }
                    return p;
                })
            );
            console.error('[usePostLike] Exception:', error);
            Alert.alert('Error', error.message || 'Failed to like post');
        } finally {
            setLikingPosts(prev => {
                const newState = { ...prev };
                delete newState[postId];
                return newState;
            });
        }
    }, [currentUserId, likingPosts, onUpdatePosts, getToken]);

    return {
        likingPosts,
        handleLikePost,
    };
};

