import { View, Text, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { getConversationName, getConversationAvatar } from '@/utils/chatUtils';

interface ChatHeaderProps {
    conversationId: string;
    conversation: any;
    currentUserId: string | null;
    messagesList: any[];
    conversationLoading: boolean;
    fallbackName?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    conversationId,
    conversation,
    currentUserId,
    messagesList,
    conversationLoading,
    fallbackName,
}) => {
    const router = useRouter();
    const navigation = useNavigation();
    const conversationData = conversation || {};

    const computedName = getConversationName(conversationData, currentUserId, messagesList);
    const nameFromConversation = conversationData?.name;
    const conversationName = (fallbackName || nameFromConversation || computedName);
    const avatarUri = getConversationAvatar(conversationData, currentUserId, messagesList);


    const handleBack = () => {
        // Restore tab bar before back
        const parent = navigation.getParent();
        if (parent) {
            parent.setOptions({
                tabBarStyle: { display: 'flex' }
            });
        }
        router.back();
    };

    return (
        <View
            className='flex-row items-center px-4 py-3 bg-white'
            style={{
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 3,
            }}
        >
            <TouchableOpacity
                onPress={handleBack}
                className='mr-3 p-1.5 rounded-full active:bg-gray-100'
            >
                <Feather name='arrow-left' size={22} color="#1DA1F2" />
            </TouchableOpacity>

            {avatarUri ? (
                <Image
                    source={{ uri: avatarUri }}
                    className='size-11 rounded-full mr-3'
                    style={{
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                    }}
                />
            ) : (
                <View
                    className='size-11 rounded-full mr-3 items-center justify-center'
                    style={{
                        backgroundColor: '#F3F4F6',
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                    }}
                >
                    <Feather
                        name={conversationData.type === 'group' ? 'users' : conversationData.type === 'class' ? 'book' : 'user'}
                        size={20}
                        color="#6B7280"
                    />
                </View>
            )}

            <View className='flex-1'>
                <Text className='text-lg font-bold text-gray-900' numberOfLines={1}>
                    {conversationLoading && !conversation && messagesList.length === 0 ? 'Loading...' : conversationName}
                </Text>
                {conversationData.type === 'class' && (
                    <View className='flex-row items-center mt-0.5'>
                        <View className='bg-blue-100 px-2 py-0.5 rounded-full'>
                            <Text className='text-xs text-blue-700 font-semibold'>Class</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Options Button */}
            <View className='flex-row items-center ml-2'>
                <TouchableOpacity className='p-2 rounded-full active:bg-gray-100'>
                    <Feather name='more-vertical' size={20} color="#1DA1F2" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

