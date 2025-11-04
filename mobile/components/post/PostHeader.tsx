import { View, Text, Image } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { RoleBadge } from '@/components/RoleBadge';
import { formatRelativeTime } from '@/utils/date';
import { PostHeaderProps } from './types';

export const PostHeader: React.FC<PostHeaderProps> = ({ user, author, createdAt }) => {
    const displayUser = user || author;
    const profilePicture = displayUser?.profilePicture;
    const firstName = displayUser?.firstName || '';
    const lastName = displayUser?.lastName || '';
    const username = displayUser?.username || 'unknown';
    const role = displayUser?.role;
    const isVerified = displayUser?.isVerified;

    return (
        <View className='flex-row items-center mb-3'>
            {profilePicture ? (
                <Image
                    source={{ uri: profilePicture }}
                    className='size-12 rounded-full mr-3'
                    style={{
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                    }}
                />
            ) : (
                <View
                    className='size-12 rounded-full mr-3 items-center justify-center'
                    style={{
                        backgroundColor: '#F3F4F6',
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                    }}
                >
                    <Feather name='user' size={22} color="#9CA3AF" />
                </View>
            )}
            <View className='flex-1'>
                <View className='flex-row items-center flex-wrap mb-1'>
                    <Text className='font-bold text-base' style={{ color: '#111827' }}>
                        {firstName} {lastName}
                    </Text>
                    {isVerified && (
                        <Feather name='check-circle' size={14} color="#1DA1F2" style={{ marginLeft: 4 }} />
                    )}
                    <RoleBadge role={role} />
                </View>
                <Text className='text-xs' style={{ color: '#6B7280' }}>
                    @{username} · {formatRelativeTime(createdAt)}
                </Text>
            </View>
        </View>
    );
};

