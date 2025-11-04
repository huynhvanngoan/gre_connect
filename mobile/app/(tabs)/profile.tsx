import { View, ScrollView, TouchableOpacity, Text } from 'react-native'
import React from 'react'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { useProfile } from '@/hooks/useProfile'
import { ProfileHeader, SettingsItem } from '@/components/profile'
import { LoadingSpinner, ErrorMessage } from '@/components/common'

const ProfileScreen = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { signOut } = useAuth();
    const { user, loading, error } = useProfile();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error: any) {
            console.error('Sign out error:', error);
        }
    };

    const settingsItems = [
        {
            icon: 'user',
            title: 'Edit Profile',
            subtitle: 'Update your profile information',
            onPress: () => {
                // TODO: Navigate to edit profile
                console.log('Edit profile');
            },
        },
        {
            icon: 'bell',
            title: 'Notifications',
            subtitle: 'Manage notification preferences',
            onPress: () => {
                // TODO: Navigate to notification settings
                console.log('Notification settings');
            },
        },
        {
            icon: 'lock',
            title: 'Privacy & Security',
            subtitle: 'Manage your privacy settings',
            onPress: () => {
                // TODO: Navigate to privacy settings
                console.log('Privacy settings');
            },
        },
        {
            icon: 'help-circle',
            title: 'Help & Support',
            subtitle: 'Get help and contact support',
            onPress: () => {
                // TODO: Navigate to help
                console.log('Help & Support');
            },
        },
        {
            icon: 'info',
            title: 'About',
            subtitle: 'App version and information',
            onPress: () => {
                // TODO: Navigate to about
                console.log('About');
            },
        },
        {
            icon: 'log-out',
            title: 'Sign Out',
            subtitle: 'Sign out of your account',
            onPress: handleSignOut,
            danger: true,
        },
    ];

    return (
        <SafeAreaView className='flex-1' style={{ backgroundColor: '#F9FAFB' }}>
            {loading ? (
                <LoadingSpinner message="Loading profile..." />
            ) : error ? (
                <ErrorMessage message={error} />
            ) : (
                <>
                    <ProfileHeader
                        user={user}
                        onEditPress={() => {
                            // TODO: Navigate to edit profile
                            console.log('Edit profile');
                        }}
                        onSettingsPress={() => {
                            // TODO: Navigate to settings
                            console.log('Settings');
                        }}
                    />

                    <ScrollView
                        className='flex-1'
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingBottom: 20 + insets.bottom,
                            paddingTop: 16,
                        }}
                    >
                        <View className='bg-white rounded-t-2xl'>
                            <View className='px-4 py-3 border-b border-gray-100'>
                                <Text className='text-lg font-bold' style={{ color: '#111827' }}>
                                    Settings
                                </Text>
                            </View>
                            {settingsItems.map((item, index) => (
                                <SettingsItem
                                    key={index}
                                    icon={item.icon}
                                    title={item.title}
                                    subtitle={item.subtitle}
                                    onPress={item.onPress}
                                    danger={item.danger}
                                />
                            ))}
                        </View>
                    </ScrollView>
                </>
            )}
        </SafeAreaView>
    )
}

export default ProfileScreen
