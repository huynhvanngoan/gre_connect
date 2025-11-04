import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { LikeButtonProps } from './types';

export const LikeButton: React.FC<LikeButtonProps> = ({
    isLiked,
    likesCount,
    isLoading = false,
    onPress,
}) => {
    return (
        <TouchableOpacity
            className='flex-row items-center justify-center flex-1'
            activeOpacity={0.7}
            onPress={onPress}
            disabled={isLoading}
        >
            <View
                className='p-2 rounded-full mr-2'
                style={{
                    backgroundColor: isLiked ? '#FEE2E2' : '#F9FAFB',
                    borderWidth: isLiked ? 1 : 0,
                    borderColor: isLiked ? '#FCA5A5' : 'transparent',
                    opacity: isLoading ? 0.6 : 1,
                }}
            >
                <Feather
                    name='heart'
                    size={18}
                    color={isLiked ? "#EF4444" : "#9CA3AF"}
                    fill={isLiked ? "#EF4444" : "none"}
                />
            </View>
            <Text
                className='text-sm font-semibold'
                style={{
                    color: isLiked ? '#EF4444' : '#6B7280'
                }}
            >
                {likesCount}
            </Text>
        </TouchableOpacity>
    );
};

