import { View, Text, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { User } from '@/types/common';
import { RoleBadge } from '@/components/RoleBadge';

export interface UserCardProps {
    user: User;
    onPress?: (user: User) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onPress }) => {
    return (
        <TouchableOpacity
            className='flex-row items-center py-2 px-2 rounded-lg'
            onPress={() => onPress?.(user)}
            activeOpacity={0.7}
            style={{
                backgroundColor: 'transparent',
            }}
        >
            {user.profilePicture ? (
                <Image
                    source={{ uri: user.profilePicture }}
                    className='size-12 rounded-full mr-3'
                />
            ) : (
                <View className='size-12 rounded-full bg-gray-200 mr-3 items-center justify-center'>
                    <Feather name='user' size={24} color="#657786" />
                </View>
            )}
            <View className='flex-1'>
                <View className='flex-row items-center'>
                    <Text className='font-semibold text-gray-900'>
                        {user.firstName} {user.lastName}
                    </Text>
                    {user.isVerified && (
                        <Feather name='check-circle' size={14} color="#1DA1F2" style={{ marginLeft: 4 }} />
                    )}
                    <RoleBadge role={user.role} />
                </View>
                <Text className='text-gray-500 text-sm'>@{user.username || 'unknown'}</Text>
                {user.role && (
                    <Text className='text-xs text-gray-400 mt-1'>{user.role}</Text>
                )}
            </View>
            <Feather name='chevron-right' size={20} color="#657786" />
        </TouchableOpacity>
    );
};

