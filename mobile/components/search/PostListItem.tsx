import { View, Text, Image } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Post } from '@/types/common';
import { PostHeader } from '@/components/post/PostHeader';
import { formatRelativeTime } from '@/utils/date';

export interface PostListItemProps {
    post: Post;
    variant?: 'default' | 'compact' | 'horizontal';
}

export const PostListItem: React.FC<PostListItemProps> = ({
    post,
    variant = 'default',
}) => {
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
                    {(post.user?.profilePicture || post.author?.profilePicture) ? (
                        <Image
                            source={{ uri: post.user?.profilePicture || post.author?.profilePicture }}
                            className='size-8 rounded-full mr-2'
                        />
                    ) : (
                        <View className='size-8 rounded-full bg-gray-200 mr-2 items-center justify-center'>
                            <Feather name='user' size={12} color="#657786" />
                        </View>
                    )}
                    <View className='flex-1'>
                        <Text className='font-semibold text-gray-900 text-xs' numberOfLines={1}>
                            {post.user?.firstName || post.author?.firstName} {post.user?.lastName || post.author?.lastName}
                        </Text>
                        <Text className='text-gray-400 text-xs'>
                            {formatRelativeTime(post.createdAt)}
                        </Text>
                    </View>
                </View>
                <Text className='text-sm text-gray-900 mb-2' numberOfLines={2}>
                    {post.content || 'No content'}
                </Text>
                <View className='flex-row items-center gap-4'>
                    <View className='flex-row items-center'>
                        <Feather name='heart' size={12} color="#ef4444" />
                        <Text className='text-gray-500 text-xs ml-1'>
                            {post.likes?.length || post.likesCount || 0}
                        </Text>
                    </View>
                    <View className='flex-row items-center'>
                        <Feather name='message-circle' size={12} color="#657786" />
                        <Text className='text-gray-500 text-xs ml-1'>
                            {post.comments?.length || post.commentsCount || 0}
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
                    {(post.user?.profilePicture || post.author?.profilePicture) ? (
                        <Image
                            source={{ uri: post.user?.profilePicture || post.author?.profilePicture }}
                            className='size-8 rounded-full mr-2'
                        />
                    ) : (
                        <View className='size-8 rounded-full bg-gray-200 mr-2 items-center justify-center'>
                            <Feather name='user' size={12} color="#657786" />
                        </View>
                    )}
                    <View className='flex-1'>
                        <Text className='font-semibold text-gray-900 text-xs'>
                            {post.user?.firstName || post.author?.firstName} {post.user?.lastName || post.author?.lastName}
                        </Text>
                        <Text className='text-gray-400 text-xs'>
                            {formatRelativeTime(post.createdAt)}
                        </Text>
                    </View>
                </View>
                <Text className='text-sm text-gray-900 mb-2' numberOfLines={2}>
                    {post.content || 'No content'}
                </Text>
                <View className='flex-row items-center gap-4'>
                    <View className='flex-row items-center'>
                        <Feather name='heart' size={12} color="#657786" />
                        <Text className='text-gray-500 text-xs ml-1'>
                            {post.likes?.length || post.likesCount || 0}
                        </Text>
                    </View>
                    <View className='flex-row items-center'>
                        <Feather name='message-circle' size={12} color="#657786" />
                        <Text className='text-gray-500 text-xs ml-1'>
                            {post.comments?.length || post.commentsCount || 0}
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
            <View className='flex-row items-center gap-4 mt-2'>
                <View className='flex-row items-center'>
                    <Feather name='heart' size={14} color="#657786" />
                    <Text className='text-gray-500 text-xs ml-1'>
                        {post.likes?.length || 0}
                    </Text>
                </View>
                <View className='flex-row items-center'>
                    <Feather name='message-circle' size={14} color="#657786" />
                    <Text className='text-gray-500 text-xs ml-1'>
                        {post.comments?.length || 0}
                    </Text>
                </View>
            </View>
        </View>
    );
};

