import { View, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationHeader, NotificationItem } from '@/components/notifications'
import { LoadingSpinner, ErrorMessage, EmptyState } from '@/components/common'
import { Notification } from '@/types/common'
import { useRouter } from 'expo-router'

const NotificationsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    notifications,
    loading,
    error,
    refreshing,
    unreadCount,
    onRefresh,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead && notification._id) {
      await markAsRead(notification._id);
    }

    // Navigate based on actionUrl
    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    } else if (notification.postId) {
      router.push(`/posts/${notification.postId}` as any);
    }
  };

  const handleDismiss = async (notification: Notification) => {
    if (notification._id) {
      await dismissNotification(notification._id);
    }
  };

  const handleMarkAllAsRead = async () => {
    Alert.alert(
      'Mark all as read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark all',
          onPress: async () => {
            await markAllAsRead();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className='flex-1' style={{ backgroundColor: '#F9FAFB' }}>
      <NotificationHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        unreadCount={unreadCount}
        onActionPress={unreadCount > 0 ? handleMarkAllAsRead : undefined}
        actionIcon={unreadCount > 0 ? 'check' : undefined}
      />

      {loading && !refreshing ? (
        <LoadingSpinner message="Loading notifications..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={onRefresh} />
      ) : (
        <ScrollView
          className='flex-1'
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#EF4444"
            />
          }
          contentContainerStyle={{
            paddingBottom: 20 + insets.bottom,
            backgroundColor: '#F9FAFB',
          }}
        >
          {notifications.length > 0 ? (
            <View className='bg-white rounded-t-2xl mt-2'>
              {notifications.map((notification: Notification, index: number) => (
                <NotificationItem
                  key={notification._id || index}
                  notification={notification}
                  onPress={handleNotificationPress}
                  onDismiss={handleDismiss}
                />
              ))}
            </View>
          ) : (
            <View className='mt-4'>
              <EmptyState
                icon="bell-off"
                title="No notifications"
                message="You're all caught up! New notifications will appear here."
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

export default NotificationsScreen
