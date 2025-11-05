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
    const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);
    const pendingMessageRef = useRef<string | null>(null);

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

    // Reverse messages to show chronologically (oldest first) and merge with optimistic messages
    const fetchedMessages = Array.isArray(messages) ? [...messages].reverse() : [];
    
    // Merge fetched messages with optimistic messages, removing duplicates
    const messagesList = React.useMemo(() => {
        const messageMap = new Map();
        
        // Add fetched messages first
        fetchedMessages.forEach(msg => {
            if (msg._id) {
                messageMap.set(msg._id.toString(), msg);
            }
        });
        
        // Add optimistic messages (they will be replaced when real message arrives)
        optimisticMessages.forEach(msg => {
            const tempId = msg._id || msg.tempId;
            if (tempId) {
                messageMap.set(tempId.toString(), msg);
            }
        });
        
        // Sort by createdAt
        return Array.from(messageMap.values()).sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeA - timeB;
        });
    }, [fetchedMessages, optimisticMessages]);

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
        
        // Create optimistic message immediately
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const userData = currentUser as any;
        const senderData = userData ? {
            _id: currentUserId || userData._id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username,
            profilePicture: userData.profilePicture,
        } : { _id: currentUserId };
        
        const optimisticMessage = {
            _id: tempId,
            tempId: tempId,
            conversation: conversationId,
            sender: senderData,
            type: 'text',
            content: content,
            status: 'sending',
            createdAt: new Date(),
            readBy: [],
        };
        
        // Add optimistic message immediately
        setOptimisticMessages(prev => [...prev, optimisticMessage]);
        setMessageText('');
        pendingMessageRef.current = tempId;

        // Scroll to bottom immediately
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);

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
                // Remove optimistic message and refetch (real message will come from API or socket)
                setOptimisticMessages(prev => prev.filter(msg => msg.tempId !== tempId));
                pendingMessageRef.current = null;
                
                // Refetch to get the real message
                await refetchMessages();
                
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            } else {
                // Remove optimistic message on error
                setOptimisticMessages(prev => prev.filter(msg => msg.tempId !== tempId));
                setMessageText(originalText);
                pendingMessageRef.current = null;
                Alert.alert('Error', response.error || 'Failed to send message');
            }
        } catch (error: any) {
            // Remove optimistic message on error
            setOptimisticMessages(prev => prev.filter(msg => msg.tempId !== tempId));
            setMessageText(originalText);
            pendingMessageRef.current = null;
            console.error('Error sending message:', error);
            Alert.alert('Error', error.message || 'Failed to send message. Please try again.');
        }
    };

    // Function to clear optimistic message when real message arrives
    const clearOptimisticMessage = React.useCallback((tempId: string) => {
        setOptimisticMessages(prev => prev.filter(msg => msg.tempId !== tempId));
        if (pendingMessageRef.current === tempId) {
            pendingMessageRef.current = null;
        }
    }, []);

    // Function to add message from socket event
    const addMessageFromSocket = React.useCallback((newMessage: any) => {
        // Clear optimistic message if this matches pending one
        const tempId = pendingMessageRef.current;
        if (tempId) {
            clearOptimisticMessage(tempId);
        }
        
        // Always refetch to get the latest messages (including the new one)
        refetchMessages();
    }, [clearOptimisticMessage, refetchMessages]);

    return {
        // State
        messageText,
        setMessageText,
        selectedMessageId,
        setSelectedMessageId,
        scrollViewRef,
        pendingMessageRef,
        clearOptimisticMessage,

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
        addMessageFromSocket,
    };
};

