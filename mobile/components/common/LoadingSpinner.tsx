import { View, Text, ActivityIndicator } from 'react-native';
import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
    size?: 'small' | 'large';
    color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = 'Loading...',
    size = 'large',
    color = '#1DA1F2',
}) => {
    return (
        <View className='flex-1 items-center justify-center py-8'>
            <ActivityIndicator size={size} color={color} />
            {message && (
                <Text className='text-gray-500 mt-2'>{message}</Text>
            )}
        </View>
    );
};

