import { View, Text } from 'react-native';
import React from 'react';
import { PostTypeBadgeProps } from './types';

export const PostTypeBadge: React.FC<PostTypeBadgeProps> = ({ postType }) => {
    if (!postType || postType === 'general') {
        return null;
    }

    return (
        <View className='self-start mb-3'>
            <View
                className='px-3 py-1.5 rounded-full'
                style={{ backgroundColor: '#DBEAFE' }}
            >
                <Text className='text-xs font-semibold' style={{ color: '#1E40AF' }}>
                    {postType.charAt(0).toUpperCase() + postType.slice(1)}
                </Text>
            </View>
        </View>
    );
};

