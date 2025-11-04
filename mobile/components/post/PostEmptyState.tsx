import { View, Text } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

export const PostEmptyState: React.FC = () => {
    return (
        <View className='py-16 items-center px-4'>
            <View
                className='p-6 rounded-full mb-4'
                style={{ backgroundColor: '#F3F4F6' }}
            >
                <Feather name='inbox' size={48} color="#9CA3AF" />
            </View>
            <Text className='text-gray-700 font-semibold text-lg mb-1'>No posts yet</Text>
            <Text className='text-gray-500 text-sm text-center'>
                Be the first to share something with the community!
            </Text>
        </View>
    );
};

