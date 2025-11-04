import { View, Text, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Notification } from '@/types/common';
import { formatRelativeTime } from '@/utils/date';

interface NotificationItemProps {
    notification: Notification;
    onPress?: (notification: Notification) => void;
    onDismiss?: (notification: Notification) => void;
}

const getNotificationIcon = (type?: string): string => {
    switch (type) {
        case 'POST_LIKE':
        case 'POST_COMMENT':
            return 'heart';
        case 'POST_MENTION':
            return 'at-sign';
        case 'FOLLOW':
            return 'user-plus';
        case 'MESSAGE':
            return 'message-circle';
        case 'COMMENT_REPLY':
            return 'corner-down-right';
        default:
            return 'bell';
    }
};

const getNotificationColor = (type?: string): string => {
    switch (type) {
        case 'POST_LIKE':
            return '#EF4444';
        case 'POST_COMMENT':
        case 'COMMENT_REPLY':
            return '#1DA1F2';
        case 'FOLLOW':
            return '#10B981';
        case 'MESSAGE':
            return '#8B5CF6';
        default:
            return '#6B7280';
    }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
    notification,
    onPress,
    onDismiss,
}) => {
    const icon = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type);
    const sender = notification.sender || (typeof notification.senderId === 'object' ? notification.senderId : null);

    return (
        <TouchableOpacity
            className='flex-row items-start px-4 py-3.5 bg-white'
            onPress={() => onPress?.(notification)}
            activeOpacity={0.7}
            style={{
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
                backgroundColor: notification.isRead ? '#FFFFFF' : '#F9FAFB',
            }}
        >
            {/* Icon */}
            <View
                className='size-12 rounded-full mr-3 items-center justify-center'
                style={{
                    backgroundColor: `${iconColor}15`,
                }}
            >
                <Feather name={icon as any} size={18} color={iconColor} />
            </View>

            {/* Content */}
            <View className='flex-1'>
                <View className='flex-row items-start justify-between mb-1'>
                    <View className='flex-1 mr-2'>
                        {sender?.profilePicture ? (
                            <View className='flex-row items-center mb-1'>
                                <Image
                                    source={{ uri: sender.profilePicture }}
                                    className='size-6 rounded-full mr-2'
                                />
                                <Text className='font-semibold text-sm' style={{ color: '#111827' }}>
                                    {sender.firstName} {sender.lastName}
                                </Text>
                            </View>
                        ) : (
                            notification.title && (
                                <Text className='font-semibold text-sm' style={{ color: '#111827' }}>
                                    {notification.title}
                                </Text>
                            )
                        )}
                        <Text className='text-sm' style={{ color: '#6B7280' }}>
                            {notification.message || 'New notification'}
                        </Text>
                    </View>
                    {onDismiss && (
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                onDismiss(notification);
                            }}
                            className='p-1 rounded-full'
                            activeOpacity={0.7}
                        >
                            <Feather name='x' size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
                <Text className='text-xs' style={{ color: '#9CA3AF' }}>
                    {formatRelativeTime(notification.createdAt)}
                </Text>
            </View>

            {/* Unread indicator */}
            {!notification.isRead && (
                <View
                    className='ml-2 size-2 rounded-full'
                    style={{
                        backgroundColor: '#1DA1F2',
                    }}
                />
            )}
        </TouchableOpacity>
    );
};

