import { Text } from 'react-native';
import React from 'react';
import { PostContentProps } from './types';

export const PostContent: React.FC<PostContentProps> = ({ content }) => {
    return (
        <Text
            className='text-base mb-3 leading-6'
            style={{ color: '#1F2937' }}
        >
            {content || 'No content'}
        </Text>
    );
};

