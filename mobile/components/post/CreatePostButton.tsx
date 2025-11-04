import { TouchableOpacity, Text, View } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { CreatePostButtonProps } from './types';

export const CreatePostButton: React.FC<CreatePostButtonProps> = ({ onPress }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            className='mx-4 mt-3 mb-2 flex-row items-center px-4 py-3 bg-white rounded-xl active:bg-gray-50'
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                elevation: 2,
            }}
        >
            <View
                className='size-12 rounded-full mr-3 items-center justify-center'
                style={{ backgroundColor: '#EFF6FF' }}
            >
                <Feather name='edit-3' size={22} color="#1DA1F2" />
            </View>
            <Text className='text-base flex-1' style={{ color: '#6B7280' }}>
                What's on your mind?
            </Text>
            <View
                className='p-1.5 rounded-full'
                style={{ backgroundColor: '#F3F4F6' }}
            >
                <Feather name='chevron-right' size={18} color="#9CA3AF" />
            </View>
        </TouchableOpacity>
    );
};

