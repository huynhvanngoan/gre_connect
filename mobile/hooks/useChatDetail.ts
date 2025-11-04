import React, { useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { apiService } from '@/services/api';
import { useApi } from './useApi';

export const useChatDetail = (conversationId: string) => {
    const router = useRouter();
    const navigation = useNavigation();
    const auth = useAuth();
    const { userId: clerkUserId, getToken } = auth;
    const [messageText, setMessageText] = useState('');
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const scrollViewRef = useRef<any>(null);

    // Fetch conversation
    const {
        data: conversation,
        loading: conversationLoading,
        error: conversationError,
        refetch: refetchConversation,
    } = useApi(
        () => apiService.getConversation(conversationId),
        [conversationId],
        { enabled: !!conversationId }
    );

    // Get current user's database ID
    const { data: currentUser } = useApi(
        () => apiService.getCurrentUser(),
        [],
        { enabled: !!clerkUserId }
    );

    const currentUserId = (currentUser as any)?._id || null;

    // Fetch messages
    const {
        data: messages,
        loading: messagesLoading,
        error: messagesError,
        refetch: refetchMessages,
    } = useApi(
        () => apiService.getMessages(conversationId, { limit: 50 }),
        [conversationId],
        { enabled: !!conversationId }
    );

    // Reverse messages to show chronologically (oldest first)
    const messagesList = Array.isArray(messages) ? [...messages].reverse() : [];

    // Hide tab bar when entering chat detail
    useFocusEffect(
        React.useCallback(() => {
            const parent = navigation.getParent();
            if (parent) {
                parent.setOptions({
                    tabBarStyle: { display: 'none' }
                });
            }

            return () => {
                const parent = navigation.getParent();
                if (parent) {
                    parent.setOptions({
                        tabBarStyle: { display: 'flex' }
                    });
                }
            };
        }, [navigation])
    );

    const handleSendMessage = async () => {
        if (!messageText.trim() || !conversationId) return;

        const content = messageText.trim();
        const originalText = messageText;
        
        setMessageText('');

        try {
            const token = await getToken?.({ skipCache: true });
            if (token) {
                apiService.setAuthToken(token);
            }
        } catch (tokenError) {
            console.warn('Could not get token:', tokenError);
        }

        try {
            const response = await apiService.sendMessage(conversationId, content);
            if (response.success) {
                await refetchMessages();
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            } else {
                setMessageText(originalText);
                Alert.alert('Error', response.error || 'Failed to send message');
            }
        } catch (error: any) {
            setMessageText(originalText);
            console.error('Error sending message:', error);
            Alert.alert('Error', error.message || 'Failed to send message. Please try again.');
        }
    };

    return {
        // State
        messageText,
        setMessageText,
        selectedMessageId,
        setSelectedMessageId,
        scrollViewRef,

        // Data
        conversation,
        conversationLoading,
        conversationError,
        messagesList,
        messagesLoading,
        messagesError,
        currentUserId,

        // Actions
        handleSendMessage,
        refetchMessages,
        refetchConversation,
    };
};

