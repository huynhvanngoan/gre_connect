import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { LikeButton } from './LikeButton';
import { PostActionsProps } from './types';

const PostActionsComponent: React.FC<PostActionsProps> = ({
    isLiked,
    likesCount,
    commentsCount,
    sharesCount,
    isLiking = false,
    onLike,
    onComment,
    onShare,
}) => {
    return (
        <View
            className='flex-row items-center justify-between pt-3 border-t'
            style={{ borderTopColor: '#F3F4F6' }}
        >
            <LikeButton
                isLiked={isLiked}
                likesCount={likesCount}
                isLoading={isLiking}
                onPress={onLike}
            />

            <TouchableOpacity
                className='flex-row items-center justify-center flex-1'
                activeOpacity={0.7}
                onPress={onComment}
            >
                <View
                    className='p-2 rounded-full mr-2'
                    style={{ backgroundColor: '#EFF6FF' }}
                >
                    <Feather name='message-circle' size={16} color="#1DA1F2" />
                </View>
                <Text className='text-sm font-medium' style={{ color: '#6B7280' }}>
                    {commentsCount}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                className='flex-row items-center justify-center flex-1'
                activeOpacity={0.7}
                onPress={onShare}
            >
                <View
                    className='p-2 rounded-full mr-2'
                    style={{ backgroundColor: '#F0FDF4' }}
                >
                    <Feather name='share-2' size={16} color="#10B981" />
                </View>
                <Text className='text-sm font-medium' style={{ color: '#6B7280' }}>
                    {sharesCount}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

// Memoize component
export const PostActions = React.memo(PostActionsComponent, (prevProps, nextProps) => {
    return (
        prevProps.isLiked === nextProps.isLiked &&
        prevProps.likesCount === nextProps.likesCount &&
        prevProps.commentsCount === nextProps.commentsCount &&
        prevProps.sharesCount === nextProps.sharesCount &&
        prevProps.isLiking === nextProps.isLiking
    );
});

