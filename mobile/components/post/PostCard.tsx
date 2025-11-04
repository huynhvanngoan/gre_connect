import { View } from 'react-native';
import React from 'react';
import { PostHeader } from './PostHeader';
import { PostContent } from './PostContent';
import { PostTypeBadge } from './PostTypeBadge';
import { PostActions } from './PostActions';
import { PostCardProps } from './types';

export const PostCard: React.FC<PostCardProps> = ({
    post,
    currentUserId,
    isLiking = false,
    onLike,
    onComment,
    onShare,
}) => {
    // Determine if post is liked
    const isLiked: boolean = post.isLiked !== undefined
        ? Boolean(post.isLiked)
        : Boolean(currentUserId && post.likes?.some((likeId: any) =>
            likeId?.toString() === currentUserId?.toString()
        ));

    const likesCount = post.likesCount !== undefined
        ? post.likesCount
        : (post.likes?.length || 0);

    const commentsCount = post.commentsCount !== undefined
        ? post.commentsCount
        : (post.comments?.length || 0);

    const sharesCount = post.sharesCount !== undefined
        ? post.sharesCount
        : (post.shares?.length || 0);

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

                <PostTypeBadge postType={post.postType || ''} />

                <PostActions
                    isLiked={isLiked}
                    likesCount={likesCount}
                    commentsCount={commentsCount}
                    sharesCount={sharesCount}
                    isLiking={isLiking}
                    onLike={async () => await onLike(post)}
                    onComment={() => onComment(post)}
                    onShare={() => onShare(post)}
                />
            </View>
        </View>
    );
};

