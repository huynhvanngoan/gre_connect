import { useState } from 'react';
import { apiService } from '@/services/api';
import { useApi } from './useApi';

export const useNotifications = () => {
    const [refreshing, setRefreshing] = useState(false);

    const { data: notifications, loading, error, refetch } = useApi(
        () => apiService.getNotifications({ limit: 50 }),
        []
    );

    const { data: unreadCountData } = useApi(
        () => apiService.getUnreadNotificationsCount(),
        []
    );

    const unreadCount = (unreadCountData as any)?.count || 0;

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const markAsRead = async (notificationId: string) => {
        await apiService.markNotificationRead(notificationId);
        refetch();
    };

    const markAllAsRead = async () => {
        await apiService.markAllNotificationsRead();
        refetch();
    };

    const dismissNotification = async (notificationId: string) => {
        await apiService.dismissNotification(notificationId);
        refetch();
    };

    return {
        notifications: Array.isArray(notifications) ? notifications : [],
        loading,
        error,
        refreshing,
        unreadCount,
        onRefresh,
        refetch,
        markAsRead,
        markAllAsRead,
        dismissNotification,
    };
};

