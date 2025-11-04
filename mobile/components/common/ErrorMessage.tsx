import { View, Text } from 'react-native';
import React from 'react';

interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    title = 'Error',
    message,
    onRetry,
}) => {
    return (
        <View className='flex-1 items-center justify-center px-4'>
            <View className='bg-red-50 p-4 rounded-lg'>
                <Text className='text-red-600 font-semibold'>{title}</Text>
                <Text className='text-red-500 text-sm mt-1'>{message}</Text>
                {onRetry && (
                    <Text
                        className='text-red-600 text-sm mt-2 underline'
                        onPress={onRetry}
                    >
                        Tap to retry
                    </Text>
                )}
            </View>
        </View>
    );
};

