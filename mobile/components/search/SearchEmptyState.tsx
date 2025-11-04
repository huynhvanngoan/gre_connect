import { View, Text } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

interface SearchEmptyStateProps {
    query?: string;
}

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({ query }) => {
    return (
        <View className='py-8 items-center px-4'>
            <Feather name='search' size={48} color="#657786" />
            {query ? (
                <>
                    <Text className='text-gray-500 mt-4 text-center'>
                        No results found for "{query}"
                    </Text>
                </>
            ) : (
                <Text className='text-gray-500 mt-4 text-center'>
                    Start typing to search for posts and users...
                </Text>
            )}
        </View>
    );
};

