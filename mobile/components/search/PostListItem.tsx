import { View, Text, Image } from 'react-native';
import React, { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { Post } from '@/types/common';
import { PostHeader } from '@/components/post/PostHeader';
import { PostTags } from '@/components/post/PostTags';
import { formatRelativeTime } from '@/utils/date';

export interface PostListItemProps {
    post: Post;
    variant?: 'default' | 'compact' | 'horizontal';
}

const PostListItemComponent: React.FC<PostListItemProps> = ({
    post,
    variant = 'default',
}) => {
    // Memoize computed values
    const profilePicture = useMemo(() =>
        post.user?.profilePicture || post.author?.profilePicture,
        [post.user?.profilePicture, post.author?.profilePicture]
    );

    const authorName = useMemo(() => {
        const firstName = post.user?.firstName || post.author?.firstName || '';
        const lastName = post.user?.lastName || post.author?.lastName || '';
        return `${firstName} ${lastName}`.trim();
    }, [post.user?.firstName, post.user?.lastName, post.author?.firstName, post.author?.lastName]);

    const likesCount = useMemo(() =>
        post.likes?.length || post.likesCount || 0,
        [post.likes, post.likesCount]
    );

    const commentsCount = useMemo(() =>
        post.comments?.length || post.commentsCount || 0,
        [post.comments, post.commentsCount]
    );

    const formattedTime = useMemo(() =>
        formatRelativeTime(post.createdAt),
        [post.createdAt]
    );
    if (variant === 'horizontal') {
        return (
            <View
                className='bg-white border border-gray-200 rounded-xl p-3 mr-3 w-64'
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3,
                }}
            >
                <View className='flex-row items-center mb-2'>
                    {profilePicture ? (
                        <Image
                            source={{ uri: profilePicture }}
                            className='size-8 rounded-full mr-2'
                            resizeMode="cover"
                        />
                    ) : (
                        <View className='size-8 rounded-full bg-gray-200 mr-2 items-center justify-center'>
                            <Feather name='user' size={12} color="#657786" />
                        </View>
                    )}
                    <View className='flex-1'>
                        <Text className='font-semibold text-gray-900 text-xs' numberOfLines={1}>
                            {authorName}
                        </Text>
                        <Text className='text-gray-400 text-xs'>
                            {formattedTime}
                        </Text>
                    </View>
                </View>
                <Text className='text-sm text-gray-900 mb-2' numberOfLines={2}>
                    {post.content || 'No content'}
                </Text>
                {post.tags && post.tags.length > 0 && (
                    <View className='mb-2'>
                        <PostTags tags={post.tags} />
                    </View>
                )}
                <View className='flex-row items-center gap-4'>
                    <View className='flex-row items-center'>
                        <Feather name='heart' size={12} color="#ef4444" />
                        <Text className='text-gray-500 text-xs ml-1'>
                            {likesCount}
                        </Text>
                    </View>
                    <View className='flex-row items-center'>
                        <Feather name='message-circle' size={12} color="#657786" />
                        <Text className='text-gray-500 text-xs ml-1'>
                            {commentsCount}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    if (variant === 'compact') {
        return (
            <View
                className='bg-white rounded-xl p-3 mb-2 border border-gray-100'
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                }}
            >
                <View className='flex-row items-center mb-2'>
                    {profilePicture ? (
                        <Image
                            source={{ uri: profilePicture }}
                            className='size-8 rounded-full mr-2'
                            resizeMode="cover"
                        />
                    ) : (
                        <View className='size-8 rounded-full bg-gray-200 mr-2 items-center justify-center'>
                            <Feather name='user' size={12} color="#657786" />
                        </View>
                    )}
                    <View className='flex-1'>
                        <Text className='font-semibold text-gray-900 text-xs'>
                            {authorName}
                        </Text>
                        <Text className='text-gray-400 text-xs'>
                            {formattedTime}
                        </Text>
                    </View>
                </View>
                <Text className='text-sm text-gray-900 mb-2' numberOfLines={2}>
                    {post.content || 'No content'}
                </Text>
                {post.tags && post.tags.length > 0 && (
                    <View className='mb-2'>
                        <PostTags tags={post.tags} />
                    </View>
                )}
                <View className='flex-row items-center gap-4'>
                    <View className='flex-row items-center'>
                        <Feather name='heart' size={12} color="#657786" />
                        <Text className='text-gray-500 text-xs ml-1'>
                            {likesCount}
                        </Text>
                    </View>
                    <View className='flex-row items-center'>
                        <Feather name='message-circle' size={12} color="#657786" />
                        <Text className='text-gray-500 text-xs ml-1'>
                            {commentsCount}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    // Default variant
    return (
        <View
            className='py-4 px-2 border-b border-gray-100 bg-white'
            style={{
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
            }}
        >
            <PostHeader
                user={post.user}
                author={post.author}
                createdAt={post.createdAt}
            />
            <Text className='text-sm text-gray-900' numberOfLines={3}>
                {post.content || 'No content'}
            </Text>
            {post.tags && post.tags.length > 0 && (
                <View className='mt-2'>
                    <PostTags tags={post.tags} />
                </View>
            )}
            <View className='flex-row items-center gap-4 mt-2'>
                <View className='flex-row items-center'>
                    <Feather name='heart' size={14} color="#657786" />
                    <Text className='text-gray-500 text-xs ml-1'>
                        {likesCount}
                    </Text>
                </View>
                <View className='flex-row items-center'>
                    <Feather name='message-circle' size={14} color="#657786" />
                    <Text className='text-gray-500 text-xs ml-1'>
                        {commentsCount}
                    </Text>
                </View>
            </View>
        </View>
    );
};

// Memoize component to prevent unnecessary re-renders
export const PostListItem = React.memo(PostListItemComponent, (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
        prevProps.post._id === nextProps.post._id &&
        prevProps.post.content === nextProps.post.content &&
        prevProps.post.likes?.length === nextProps.post.likes?.length &&
        prevProps.post.likesCount === nextProps.post.likesCount &&
        prevProps.post.comments?.length === nextProps.post.comments?.length &&
        prevProps.post.commentsCount === nextProps.post.commentsCount &&
        prevProps.post.tags?.join(',') === nextProps.post.tags?.join(',') &&
        prevProps.variant === nextProps.variant
    );
});

