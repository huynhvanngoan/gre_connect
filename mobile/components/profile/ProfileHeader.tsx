import { View, Text, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { User } from '@/types/common';
import { RoleBadge } from '@/components/RoleBadge';

interface ProfileHeaderProps {
    user?: User;
    onEditPress?: () => void;
    onSettingsPress?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    user,
    onEditPress,
    onSettingsPress,
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
            <View className='flex-row items-center justify-between mb-3'>
                <View className='flex-1'>
                    <View className='flex-row items-center mb-1'>
                        <View
                            className='size-10 rounded-xl mr-3 items-center justify-center'
                            style={{
                                backgroundColor: '#10B981',
                                shadowColor: '#10B981',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            <Feather name='user' size={20} color="#FFFFFF" />
                        </View>
                        <View className='flex-1'>
                            <Text className='text-2xl font-bold' style={{ color: '#111827' }}>
                                Profile
                            </Text>
                            <Text className='text-xs' style={{ color: '#9CA3AF', marginTop: -2 }}>
                                Your account information
                            </Text>
                        </View>
                    </View>
                </View>
                {onSettingsPress && (
                    <TouchableOpacity
                        onPress={onSettingsPress}
                        className='p-2 rounded-full'
                        style={{ backgroundColor: '#F0FDF4' }}
                        activeOpacity={0.7}
                    >
                        <Feather name='settings' size={20} color="#10B981" />
                    </TouchableOpacity>
                )}
            </View>

            {/* User Info Card */}
            {user && (
                <View
                    className='bg-gray-50 rounded-xl p-4 mt-2'
                    style={{
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                    }}
                >
                    <View className='flex-row items-center mb-3'>
                        {user.profilePicture ? (
                            <View
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 3,
                                }}
                            >
                                <Image
                                    source={{ uri: user.profilePicture }}
                                    className='size-20 rounded-full mr-4'
                                    style={{
                                        borderWidth: 3,
                                        borderColor: '#FFFFFF',
                                    }}
                                />
                            </View>
                        ) : (
                            <View
                                className='size-20 rounded-full mr-4 items-center justify-center'
                                style={{
                                    backgroundColor: '#10B981',
                                    borderWidth: 3,
                                    borderColor: '#FFFFFF',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 3,
                                }}
                            >
                                <Feather name='user' size={32} color="#FFFFFF" />
                            </View>
                        )}
                        <View className='flex-1'>
                            <View className='flex-row items-center flex-wrap mb-1'>
                                <Text className='text-xl font-bold' style={{ color: '#111827' }}>
                                    {user.firstName} {user.lastName}
                                </Text>
                                {user.isVerified && (
                                    <Feather name='check-circle' size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />
                                )}
                            </View>
                            <Text className='text-sm' style={{ color: '#6B7280', marginBottom: 4 }}>
                                @{user.username || 'unknown'}
                            </Text>
                            <RoleBadge role={user.role} />
                        </View>
                        {onEditPress && (
                            <TouchableOpacity
                                onPress={onEditPress}
                                className='px-3 py-1.5 rounded-full'
                                style={{ backgroundColor: '#1DA1F2' }}
                                activeOpacity={0.7}
                            >
                                <Feather name='edit-3' size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {user.email && (
                        <View className='flex-row items-center'>
                            <Feather name='mail' size={14} color="#6B7280" />
                            <Text className='text-sm ml-2' style={{ color: '#6B7280' }}>
                                {user.email}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

