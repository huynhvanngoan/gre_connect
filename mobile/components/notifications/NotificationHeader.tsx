import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

interface NotificationHeaderProps {
    title?: string;
    subtitle?: string;
    unreadCount?: number;
    onActionPress?: () => void;
    actionIcon?: string;
}

export const NotificationHeader: React.FC<NotificationHeaderProps> = ({
    title = 'Notifications',
    subtitle,
    unreadCount = 0,
    onActionPress,
    actionIcon = 'settings',
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
                                backgroundColor: '#EF4444',
                                shadowColor: '#EF4444',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            <Feather name='bell' size={20} color="#FFFFFF" />
                            {unreadCount > 0 && (
                                <View
                                    className='absolute -top-1 -right-1 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1'
                                    style={{
                                        backgroundColor: '#1DA1F2',
                                        borderWidth: 2,
                                        borderColor: '#FFFFFF',
                                    }}
                                >
                                    <Text className='text-white text-[10px] font-bold'>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
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
                        style={{ backgroundColor: '#FEF2F2' }}
                        activeOpacity={0.7}
                    >
                        <Feather name={actionIcon as any} size={20} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

