import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

interface SectionHeaderProps {
    title: string;
    icon?: string;
    iconColor?: string;
    onViewAll?: () => void;
    viewAllLabel?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    icon,
    iconColor = "#657786",
    onViewAll,
    viewAllLabel = "View All",
}) => {
    return (
        <View className='flex-row items-center justify-between mb-3'>
            <View className='flex-row items-center'>
                {icon && (
                    <Feather name={icon as any} size={18} color={iconColor} />
                )}
                <Text className='text-lg font-semibold text-gray-900 ml-2'>{title}</Text>
            </View>
            {onViewAll && (
                <TouchableOpacity onPress={onViewAll}>
                    <Text className='text-blue-600 text-sm'>{viewAllLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

