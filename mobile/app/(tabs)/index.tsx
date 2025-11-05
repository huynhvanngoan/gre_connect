import { View, FlatList, RefreshControl, ListRenderItem } from 'react-native'
import React, { useState, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '@clerk/clerk-expo'
import { useHomeFeed } from '@/hooks/useHomeFeed'
import { useApi } from '@/hooks/useApi'
import { usePostLike } from '@/hooks/usePostLike'
import { Post } from '@/types/common'
import { CreatePostButton, HomeHeader, PostCard, PostEmptyState } from '@/components/post'
import { LoadingSpinner, ErrorMessage } from '@/components/common'
import { apiService } from '@/services/api'
import { useSocket } from '@/hooks/useSocket'

const HomeScreen = () => {
    const router = useRouter();
    const { userId: clerkUserId } = useAuth();
    const { posts: originalPosts, loading, error, refreshing, onRefresh, refetch } = useHomeFeed();
    const [localPosts, setLocalPosts] = useState<Post[]>([]);

    // Get current user's database ID to check likes
    const { data: currentUser } = useApi(
        () => apiService.getCurrentUser(),
        [],
        { enabled: !!clerkUserId }
    );
    const currentUserId = (currentUser as any)?._id || null;

    // Update localPosts when originalPosts changes
    React.useEffect(() => {
        if (Array.isArray(originalPosts)) {
            setLocalPosts(originalPosts);
        }
    }, [originalPosts]);

    // Handle post updates (for optimistic updates)
    const handleUpdatePosts = useCallback((updater: (posts: Post[]) => Post[]) => {
        setLocalPosts(prev => updater([...prev]));
    }, []);

    // Use post like hook
    const { likingPosts, handleLikePost } = usePostLike({
        currentUserId,
        onUpdatePosts: handleUpdatePosts,
    });

    // Socket.IO for real-time updates
    const { socket } = useSocket();

    // Listen for post updates (likes, comments, shares)
    React.useEffect(() => {
        if (!socket) return;

        const onPostUpdate = (data: { postId: string; likesCount?: number; commentsCount?: number; sharesCount?: number }) => {
            handleUpdatePosts(prev => prev.map(p => {
                if (p._id === data.postId) {
                    const next = { ...p } as any;
                    if (data.likesCount !== undefined) next.likesCount = data.likesCount;
                    if (data.commentsCount !== undefined) next.commentsCount = data.commentsCount;
                    if (data.sharesCount !== undefined) next.sharesCount = data.sharesCount;
                    return next as Post;
                }
                return p;
            }));
        };

        const onNewLike = (data: { postId: string }) => {
            handleUpdatePosts(prev => prev.map(p => {
                if (p._id === data.postId) {
                    const next = { ...p } as any;
                    next.likesCount = (next.likesCount || 0) + 1;
                    next.isLiked = true;
                    return next as Post;
                }
                return p;
            }));
        };

        const onNewComment = (data: { postId: string }) => {
            handleUpdatePosts(prev => prev.map(p => {
                if (p._id === data.postId) {
                    const next = { ...p } as any;
                    next.commentsCount = (next.commentsCount || 0) + 1;
                    return next as Post;
                }
                return p;
            }));
        };

        socket.on('post-updated', onPostUpdate);
        socket.on('new-like', onNewLike);
        socket.on('new-comment', onNewComment);

        return () => {
            socket.off('post-updated', onPostUpdate);
            socket.off('new-like', onNewLike);
            socket.off('new-comment', onNewComment);
        };
    }, [socket, handleUpdatePosts]);

    // Refresh posts when screen comes into focus (e.g., after creating a post)
    useFocusEffect(
        React.useCallback(() => {
            // Refetch posts when screen is focused
            refetch();
        }, [refetch])
    );

    const handleCreatePost = () => {
        router.push('/create-post' as any);
    };

    const handleCommentPost = (post: Post) => {
        if (!post?._id) return;
        router.push(`/posts/${post._id}` as any);
    };

    const handleSharePost = async (post: Post) => {
        if (!post?._id) return;
        // Optimistic update sharesCount
        handleUpdatePosts(prev => prev.map(p => {
            if (p._id === post._id) {
                const next = { ...p } as any;
                next.sharesCount = (next.sharesCount || 0) + 1;
                return next as Post;
            }
            return p;
        }));
        try {
            await apiService.sharePost(post._id);
        } catch (e) {
            // Revert on failure
            handleUpdatePosts(prev => prev.map(p => {
                if (p._id === post._id) {
                    const next = { ...p } as any;
                    next.sharesCount = Math.max(0, (next.sharesCount || 1) - 1);
                    return next as Post;
                }
                return p;
            }));
        }
    };

    return (
        <SafeAreaView className='flex-1' style={{ backgroundColor: '#F9FAFB' }}>
            <HomeHeader onLogoPress={handleCreatePost} />

            <CreatePostButton onPress={handleCreatePost} />

            {loading && !refreshing ? (
                <LoadingSpinner message="Loading posts..." />
            ) : error ? (
                <ErrorMessage message={error} onRetry={refetch} />
            ) : (
                <FlatList
                    data={localPosts.length > 0 ? localPosts : []}
                    keyExtractor={(item) => item._id || `post-${Math.random()}`}
                    renderItem={({ item }) => (
                        <PostCard
                            post={item}
                            currentUserId={currentUserId}
                            isLiking={likingPosts[item._id?.toString() || ''] || false}
                            onLike={handleLikePost}
                            onComment={handleCommentPost}
                            onShare={handleSharePost}
                        />
                    )}
                    ListEmptyComponent={<PostEmptyState />}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={{ paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={5}
                    removeClippedSubviews={true}
                    getItemLayout={(data, index) => ({
                        length: 200,
                        offset: 200 * index,
                        index,
                    })}
                />
            )}
        </SafeAreaView>
    )
}

export default HomeScreen
