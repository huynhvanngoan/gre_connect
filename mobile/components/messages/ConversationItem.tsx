import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Conversation, User } from '@/types/common';
import { formatRelativeTime } from '@/utils/date';

export interface ConversationItemProps {
    conversation: Conversation;
    currentUserId: string | null;
    onPress: (conversation: Conversation) => void;
    onLongPress?: (conversation: Conversation) => void;
    clearedUnread?: boolean;
}

const getConversationName = (conversation: Conversation, currentUserId: string | null): string => {
    if (conversation.type === 'direct') {
        const otherParticipant = conversation.participants?.find(
            (p: any) => {
                const participantId = typeof p.user === 'object'
                    ? p.user?._id?.toString()
                    : p.user?.toString();
                const currentId = currentUserId?.toString();
                return participantId && currentId && participantId !== currentId;
            }
        );
        const user = otherParticipant?.user as User | undefined;
        if (user) {
            return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown User';
        }
        return 'Unknown User';
    }
    return conversation.name || 'Unnamed';
};

const getConversationAvatar = (conversation: Conversation, currentUserId: string | null): string | null => {
    if (conversation.type === 'direct') {
        const otherParticipant = conversation.participants?.find(
            (p: any) => {
                const participantId = typeof p.user === 'object'
                    ? p.user?._id?.toString()
                    : p.user?.toString();
                const currentId = currentUserId?.toString();
                return participantId && currentId && participantId !== currentId;
            }
        );
        const user = otherParticipant?.user as User | undefined;
        return user?.profilePicture || null;
    }
    return conversation.avatar || null;
};

const ConversationItemComponent: React.FC<ConversationItemProps> = ({
    conversation,
    currentUserId,
    onPress,
    onLongPress,
    clearedUnread = false,
}) => {
    const avatarUri = getConversationAvatar(conversation, currentUserId);
    const conversationName = getConversationName(conversation, currentUserId);
    const lastMessage = conversation.lastMessage;

    const handleLongPress = () => {
        if (onLongPress) {
            onLongPress(conversation);
        } else {
            Alert.alert(
                "Delete Conversation",
                "Are you sure you want to delete this conversation?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                            console.log('Delete conversation:', conversation._id);
                        },
                    },
                ]
            );
        }
    };

    return (
        <TouchableOpacity
            className='flex-row items-center px-4 py-3.5 bg-white'
            onPress={() => onPress(conversation)}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
            style={{
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
            }}
        >
            {avatarUri ? (
                <View className='mr-3'>
                    <Image
                        source={{ uri: avatarUri }}
                        className='size-14 rounded-full'
                        style={{
                            borderWidth: 2,
                            borderColor: '#E5E7EB',
                        }}
                    />
                </View>
            ) : (
                <View
                    className='size-14 rounded-full mr-3 items-center justify-center'
                    style={{
                        backgroundColor: '#1DA1F2',
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                        shadowColor: '#1DA1F2',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <Feather
                        name={conversation.type === 'group' ? 'users' : conversation.type === 'class' ? 'book' : 'user'}
                        size={22}
                        color="#fff"
                    />
                </View>
            )}

            <View className='flex-1'>
                <View className='flex-row items-center justify-between mb-1'>
                    <View className='flex-row items-center flex-1'>
                        <Text className='font-bold text-gray-900 text-base' numberOfLines={1}>
                            {conversationName}
                        </Text>
                        {conversation.type === 'class' && (
                            <View
                                className='ml-2 px-2 py-0.5 rounded-full'
                                style={{
                                    backgroundColor: '#DBEAFE',
                                }}
                            >
                                <Text className='text-xs font-semibold' style={{ color: '#1E40AF' }}>Class</Text>
                            </View>
                        )}
                    </View>
                    {(conversation as any).lastMessageAt || lastMessage?.createdAt ? (
                        <Text className='text-gray-400 text-xs ml-2 font-medium'>
                            {formatRelativeTime(((conversation as any).lastMessageAt || lastMessage?.createdAt) as any)}
                        </Text>
                    ) : null}
                </View>
                {lastMessage && (
                    <View className='flex-row items-center justify-between'>
                        <Text className='text-gray-600 text-sm flex-1' numberOfLines={1}>
                            {lastMessage.content || '📎 Attachment'}
                        </Text>
                        {(clearedUnread ? 0 : (conversation.unreadCount || 0)) > 0 && (
                            <View
                                className='ml-2 rounded-full min-w-[20px] h-5 items-center justify-center px-2'
                                style={{
                                    backgroundColor: '#1DA1F2',
                                    shadowColor: '#1DA1F2',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 2,
                                    elevation: 2,
                                }}
                            >
                                <Text className='text-white text-xs font-bold'>
                                    {(clearedUnread ? 0 : (conversation.unreadCount || 0)) > 99 ? '99+' : (clearedUnread ? 0 : (conversation.unreadCount || 0))}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                {!lastMessage && conversation.unreadCount && conversation.unreadCount > 0 && (
                    <View
                        className='self-start rounded-full px-2 py-1 mt-1'
                        style={{
                            backgroundColor: '#1DA1F2',
                            shadowColor: '#1DA1F2',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.3,
                            shadowRadius: 2,
                            elevation: 2,
                        }}
                    >
                        <Text className='text-white text-xs font-bold'>
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Text>
                    </View>
                )}
            </View>

            <View className='ml-3 flex-row items-center'>
                <Feather name='chevron-right' size={20} color="#9CA3AF" />
            </View>
        </TouchableOpacity>
    );
};

// Memoize to prevent unnecessary re-renders when list scrolls
export const ConversationItem = React.memo(ConversationItemComponent, (prevProps, nextProps) => {
    // Only re-render if these key props change
    return (
        prevProps.conversation._id === nextProps.conversation._id &&
        prevProps.conversation.lastMessage?._id === nextProps.conversation.lastMessage?._id &&
        prevProps.conversation.lastMessage?.content === nextProps.conversation.lastMessage?.content &&
        prevProps.conversation.unreadCount === nextProps.conversation.unreadCount &&
        prevProps.clearedUnread === nextProps.clearedUnread &&
        prevProps.currentUserId === nextProps.currentUserId
    );
});

