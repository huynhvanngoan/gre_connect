import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useConversations } from '@/hooks/useConversations'
import { ConversationItem, MessagesHeader, TabBar, TabType } from '@/components/messages'
import { LoadingSpinner, ErrorMessage, EmptyState } from '@/components/common'
import { getConversationName } from '@/utils/chatUtils'
import { apiService } from '@/services/api'
import { useAuth } from '@clerk/clerk-expo'
import { useSocket } from '@/hooks/useSocket'

const MessagesScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('direct');
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  const directConversations = useConversations('direct');
  const groupConversations = useConversations('group');
  const classConversations = useConversations('class');

  // Get current user ID from any of the hooks (they all have it)
  const currentUserId = directConversations.currentUserId ||
    groupConversations.currentUserId ||
    classConversations.currentUserId;

  const getActiveData = () => {
    switch (activeTab) {
      case 'direct':
        return directConversations;
      case 'group':
        return groupConversations;
      case 'class':
        return classConversations;
      default:
        return directConversations;
    }
  };

  const activeData = getActiveData();
  const { getToken } = useAuth();
  const { socket } = useSocket();

  // (logs cleared)

  // Refetch conversations when this screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      activeData.refetch?.();
    }, [activeTab, activeData.refetch])
  );

  // Realtime: refresh list when a new message notification arrives
  React.useEffect(() => {
    if (!socket) return;
    const onMessageNotification = () => {
      activeData.refetch?.();
    };
    const onMessagesReadAll = () => {
      activeData.refetch?.();
    };
    const onConversationUpdated = () => {
      activeData.refetch?.();
    };
    socket.on('message-notification', onMessageNotification);
    socket.on('messages-read-all', onMessagesReadAll);
    socket.on('conversation-updated', onConversationUpdated);
    return () => {
      socket.off('message-notification', onMessageNotification);
      socket.off('messages-read-all', onMessagesReadAll);
      socket.off('conversation-updated', onConversationUpdated);
    };
  }, [socket, activeData]);

  const tabs = [
    { key: 'direct' as TabType, label: 'Direct', icon: 'message-circle' },
    { key: 'group' as TabType, label: 'Group', icon: 'users' },
    { key: 'class' as TabType, label: 'Class', icon: 'book' },
  ];

  return (
    <SafeAreaView className='flex-1' style={{ backgroundColor: '#F9FAFB' }}>
      <MessagesHeader
        title="Messages"
        subtitle="Your conversations"
        onActionPress={() => {
          // TODO: Navigate to new conversation or filter
          console.log('New message action');
        }}
      />

      {/* Tabs */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Search Bar */}
      <View className='px-4 py-3 bg-white border-b border-gray-100'>
        <View
          className='flex-row items-center rounded-full px-4 py-3 border'
          style={{
            backgroundColor: '#F9FAFB',
            borderColor: '#E5E7EB',
          }}
        >
          <Feather name='search' size={18} color="#9CA3AF" />
          <TextInput
            placeholder={`Search ${activeTab} conversations...`}
            className='flex-1 ml-3 text-base'
            placeholderTextColor="#9CA3AF"
            value={activeData.searchText}
            onChangeText={activeData.setSearchText}
            style={{ color: '#111827' }}
          />
          {activeData.searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => activeData.setSearchText('')}
              activeOpacity={0.7}
            >
              <Feather name='x' size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversation List */}
      {activeData.loading && !activeData.refreshing ? (
        <LoadingSpinner message="Loading conversations..." />
      ) : activeData.error ? (
        <ErrorMessage message={activeData.error} onRetry={activeData.onRefresh} />
      ) : (
        <ScrollView
          className='flex-1'
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activeData.refreshing}
              onRefresh={activeData.onRefresh}
              tintColor="#1DA1F2"
            />
          }
          contentContainerStyle={{
            paddingBottom: 20 + insets.bottom,
            backgroundColor: '#F9FAFB',
          }}
        >
          {activeData.conversations.length > 0 ? (
            <View className='bg-white rounded-t-2xl mt-2'>
              {activeData.conversations.map((conversation: any, index: number) => (
                <ConversationItem
                  key={conversation._id || index}
                  conversation={conversation}
                  currentUserId={currentUserId}
                  onPress={(conv) => {
                    const displayName = getConversationName(conv, currentUserId, []);
                    if (!conv?._id) return;
                    // Navigate immediately to avoid delay
                    router.push({ pathname: `/messages/${conv._id as string}`, params: displayName ? { name: displayName } : {} } as any);
                    setClearedIds(prev => new Set([...Array.from(prev), conv._id as string]));
                    // Background: mark as read and refresh list
                    (async () => {
                      try {
                        const token = await getToken?.({ skipCache: true });
                        if (token) apiService.setAuthToken(token);
                        await apiService.markAllMessagesRead(conv._id as string);
                        activeData.refetch?.();
                      } catch { }
                    })();
                  }}
                  clearedUnread={conversation._id ? clearedIds.has(conversation._id as string) : false}
                />
              ))}
            </View>
          ) : (
            <View className='mt-4'>
              <EmptyState
                icon="inbox"
                title={`No ${activeTab} conversations yet`}
                message="Start a conversation to see it here"
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

export default MessagesScreen
