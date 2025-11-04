import { View, Text } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

interface EmptyStateProps {
    icon?: string;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'inbox',
    title,
    message,
    actionLabel,
    onAction,
}) => {
    return (
        <View className='py-16 items-center px-4'>
            <View
                className='p-6 rounded-full mb-4'
                style={{ backgroundColor: '#F3F4F6' }}
            >
                <Feather name={icon as any} size={48} color="#9CA3AF" />
            </View>
            <Text className='text-gray-700 font-semibold text-lg mb-1'>{title}</Text>
            {message && (
                <Text className='text-gray-500 text-sm text-center'>{message}</Text>
            )}
            {actionLabel && onAction && (
                <Text
                    className='text-blue-600 text-sm mt-4 underline'
                    onPress={onAction}
                >
                    {actionLabel}
                </Text>
            )}
        </View>
    );
};

