import { View, Text, Image } from 'react-native';
import React, { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { RoleBadge } from '@/components/RoleBadge';
import { formatRelativeTime } from '@/utils/date';
import { PostHeaderProps } from './types';

const PostHeaderComponent: React.FC<PostHeaderProps> = ({ user, author, createdAt }) => {
    const displayUser = useMemo(() => user || author, [user, author]);

    const profilePicture = useMemo(() => displayUser?.profilePicture, [displayUser?.profilePicture]);
    const firstName = useMemo(() => displayUser?.firstName || '', [displayUser?.firstName]);
    const lastName = useMemo(() => displayUser?.lastName || '', [displayUser?.lastName]);
    const username = useMemo(() => displayUser?.username || 'unknown', [displayUser?.username]);
    const role = useMemo(() => displayUser?.role, [displayUser?.role]);
    const isVerified = useMemo(() => displayUser?.isVerified, [displayUser?.isVerified]);

    const formattedTime = useMemo(() => formatRelativeTime(createdAt), [createdAt]);

    return (
        <View className='flex-row items-center mb-3'>
            {profilePicture ? (
                <Image
                    source={{ uri: profilePicture }}
                    className='size-12 rounded-full mr-3'
                    resizeMode="cover"
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
                    @{username} · {formattedTime}
                </Text>
            </View>
        </View>
    );
};

// Memoize component
export const PostHeader = React.memo(PostHeaderComponent, (prevProps, nextProps) => {
    // Compare by reference or key properties
    const prevUserKey = prevProps.user?.username || prevProps.user?.firstName;
    const nextUserKey = nextProps.user?.username || nextProps.user?.firstName;
    const prevAuthorKey = prevProps.author?.username || prevProps.author?.firstName;
    const nextAuthorKey = nextProps.author?.username || nextProps.author?.firstName;

    return (
        prevUserKey === nextUserKey &&
        prevAuthorKey === nextAuthorKey &&
        prevProps.createdAt === nextProps.createdAt
    );
});

