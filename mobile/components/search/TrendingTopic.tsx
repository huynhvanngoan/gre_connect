import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { TrendingTopic as TrendingTopicType } from '@/types/common';

export interface TrendingTopicProps {
    topic: TrendingTopicType;
    onPress: (topic: string) => void;
}

export const TrendingTopic: React.FC<TrendingTopicProps> = ({ topic, onPress }) => {
    return (
        <TouchableOpacity
            onPress={() => onPress(topic.topic)}
            className='bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 rounded-full border border-blue-200'
            activeOpacity={0.7}
            style={{
                shadowColor: '#1DA1F2',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
            }}
        >
            <View className='flex-row items-center'>
                <Feather name='tag' size={14} color="#1DA1F2" />
                <Text className='text-blue-600 font-medium ml-1'>
                    {topic.topic}
                </Text>
                <Text className='text-blue-400 text-xs ml-2'>
                    {topic.postsCount || topic.count}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

