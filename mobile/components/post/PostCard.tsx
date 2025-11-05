import { View } from 'react-native';
import React, { useMemo } from 'react';
import { PostHeader } from './PostHeader';
import { PostContent } from './PostContent';
import { PostTypeBadge } from './PostTypeBadge';
import { PostActions } from './PostActions';
import { PostTags } from './PostTags';
import { PostCardProps } from './types';

const PostCardComponent: React.FC<PostCardProps> = ({
    post,
    currentUserId,
    isLiking = false,
    onLike,
    onComment,
    onShare,
}) => {
    // Memoize expensive calculations
    const isLiked = useMemo(() => {
        if (post.isLiked !== undefined) {
            return Boolean(post.isLiked);
        }
        if (!currentUserId || !post.likes) return false;
        return post.likes.some((likeId: any) =>
            likeId?.toString() === currentUserId?.toString()
        );
    }, [post.isLiked, post.likes, currentUserId]);

    const likesCount = useMemo(() =>
        post.likesCount !== undefined
            ? post.likesCount
            : (post.likes?.length || 0),
        [post.likesCount, post.likes]
    );

    const commentsCount = useMemo(() =>
        post.commentsCount !== undefined
            ? post.commentsCount
            : (post.comments?.length || 0),
        [post.commentsCount, post.comments]
    );

    const sharesCount = useMemo(() =>
        post.sharesCount !== undefined
            ? post.sharesCount
            : (post.shares?.length || 0),
        [post.sharesCount, post.shares]
    );

    const handleLike = useMemo(() => () => onLike(post), [post, onLike]);
    const handleComment = useMemo(() => () => onComment(post), [post, onComment]);
    const handleShare = useMemo(() => () => onShare(post), [post, onShare]);

    return (
        <View
            className='mx-4 mt-3 mb-2 bg-white rounded-xl'
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                elevation: 2,
                overflow: 'hidden',
            }}
        >
            <View className='p-4'>
                <PostHeader
                    user={post.user}
                    author={post.author}
                    createdAt={post.createdAt}
                />

                <PostContent content={post.content} />

                {post.tags && post.tags.length > 0 && (
                    <PostTags tags={post.tags} />
                )}

                <PostTypeBadge postType={post.postType || ''} />

                <PostActions
                    isLiked={isLiked}
                    likesCount={likesCount}
                    commentsCount={commentsCount}
                    sharesCount={sharesCount}
                    isLiking={isLiking}
                    onLike={handleLike}
                    onComment={handleComment}
                    onShare={handleShare}
                />
            </View>
        </View>
    );
};

// Memoize component to prevent unnecessary re-renders
export const PostCard = React.memo(PostCardComponent, (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
        prevProps.post._id === nextProps.post._id &&
        prevProps.post.isLiked === nextProps.post.isLiked &&
        prevProps.post.likesCount === nextProps.post.likesCount &&
        prevProps.post.commentsCount === nextProps.post.commentsCount &&
        prevProps.post.sharesCount === nextProps.post.sharesCount &&
        prevProps.currentUserId === nextProps.currentUserId &&
        prevProps.isLiking === nextProps.isLiking
    );
});

