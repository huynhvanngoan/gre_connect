import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

interface SearchHeaderProps {
    title?: string;
    subtitle?: string;
    onActionPress?: () => void;
    actionIcon?: string;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
    title = 'Search',
    subtitle,
    onActionPress,
    actionIcon = 'filter',
}) => {
    return (
        <View
            className='px-4 pt-4 pb-3 bg-white border-b border-gray-100'
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 3,
            }}
        >
            <View className='flex-row items-center justify-between'>
                <View className='flex-1'>
                    <View className='flex-row items-center mb-1'>
                        <View
                            className='size-10 rounded-xl mr-3 items-center justify-center'
                            style={{
                                backgroundColor: '#1DA1F2',
                                shadowColor: '#1DA1F2',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            <Feather name='search' size={20} color="#FFFFFF" />
                        </View>
                        <View className='flex-1'>
                            <Text className='text-2xl font-bold' style={{ color: '#111827' }}>
                                {title}
                            </Text>
                            {subtitle && (
                                <Text className='text-xs' style={{ color: '#9CA3AF', marginTop: -2 }}>
                                    {subtitle}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
                {onActionPress && (
                    <TouchableOpacity
                        onPress={onActionPress}
                        className='p-2 rounded-full'
                        style={{ backgroundColor: '#EFF6FF' }}
                        activeOpacity={0.7}
                    >
                        <Feather name={actionIcon as any} size={20} color="#1DA1F2" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

