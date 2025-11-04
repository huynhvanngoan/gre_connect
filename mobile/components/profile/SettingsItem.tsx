import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

interface SettingsItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    rightIcon?: string;
    badge?: string | number;
    danger?: boolean;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    rightIcon = 'chevron-right',
    badge,
    danger = false,
}) => {
    return (
        <TouchableOpacity
            className='flex-row items-center px-4 py-3.5 bg-white'
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
            }}
        >
            <View
                className='size-10 rounded-lg mr-3 items-center justify-center'
                style={{
                    backgroundColor: danger ? '#FEF2F2' : '#EFF6FF',
                }}
            >
                <Feather
                    name={icon as any}
                    size={18}
                    color={danger ? '#EF4444' : '#1DA1F2'}
                />
            </View>
            <View className='flex-1'>
                <Text
                    className='font-semibold text-base'
                    style={{ color: danger ? '#EF4444' : '#111827' }}
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text className='text-sm mt-0.5' style={{ color: '#6B7280' }}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {badge && (
                <View
                    className='mr-2 px-2 py-0.5 rounded-full'
                    style={{
                        backgroundColor: '#1DA1F2',
                    }}
                >
                    <Text className='text-white text-xs font-bold'>
                        {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                    </Text>
                </View>
            )}
            <Feather name={rightIcon as any} size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
};

