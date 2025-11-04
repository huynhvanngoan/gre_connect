import { View, Text, ScrollView, Image, ActivityIndicator, Alert, TouchableOpacity, FlatList, ListRenderItemInfo } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '@/services/api';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useChatDetail } from '@/hooks/useChatDetail';
import { useAuth } from '@clerk/clerk-expo';
import { useSocket } from '@/hooks/useSocket';
import { joinConversationRoom, leaveConversationRoom, sendTypingStatus } from '@/services/socket';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { MemoMessageBubble as MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

const ChatDetailScreen = () => {
    const { id, name: fallbackName } = useLocalSearchParams<{ id: string; name?: string }>();

    const {
        messageText,
        setMessageText,
        selectedMessageId,
        setSelectedMessageId,
        scrollViewRef,
        conversation,
        conversationLoading,
        messagesList,
        messagesLoading,
        currentUserId,
        handleSendMessage,
        refetchMessages,
    } = useChatDetail(id || '');
    const conversationData = (conversation as any) || {};
    const { getToken } = useAuth();
    const { socket } = useSocket();
    const [pendingFiles, setPendingFiles] = React.useState<Array<{ uri: string; mimeType?: string; fileName?: string; kind: 'image' | 'video' | 'file' }>>([]);
    const [typingUsers, setTypingUsers] = React.useState<Set<string>>(new Set());
    const typingTimeoutRef = React.useRef<number | null>(null);

    // Note: don't early-return before hooks to preserve hook order

    const handleAttach = async () => {
        Alert.alert(
            'Attachments',
            'Choose an option',
            [
                {
                    text: 'Photo & Video', onPress: async () => {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (perm.status !== 'granted') return;
                        const res: any = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
                        if (!res.canceled && res.assets && res.assets.length) {
                            const items = res.assets.map((a: any) => ({
                                uri: a.uri,
                                mimeType: a.type === 'video' ? (a.mimeType || 'video/mp4') : (a.mimeType || 'image/jpeg'),
                                fileName: a.fileName || 'upload',
                                kind: a.type === 'video' ? 'video' : 'image' as const,
                            }));
                            setPendingFiles(prev => [...prev, ...items]);
                        }
                    }
                },
                {
                    text: 'Document', onPress: async () => {
                        const res: any = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
                        const a = res?.assets?.[0] || (res?.type === 'success' ? res : null);
                        if (a?.uri) {
                            setPendingFiles(prev => [...prev, { uri: a.uri, mimeType: a.mimeType || 'application/octet-stream', fileName: a.name || a.fileName || 'attachment', kind: 'file' }]);
                        }
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleRemovePending = (uri: string) => {
        setPendingFiles(prev => prev.filter(f => f.uri !== uri));
    };

    const handleSend = async () => {
        // If there are pending files, send multipart with all files + text
        if (pendingFiles.length > 0) {
            try {
                const token = await getToken?.({ skipCache: true });
                if (token) apiService.setAuthToken(token);
                await apiService.sendMessageFormMulti(id || '', {
                    content: messageText?.trim() || undefined,
                    files: pendingFiles.map(f => ({ uri: f.uri, mimeType: f.mimeType, fileName: f.fileName }))
                });
                setPendingFiles([]);
                setMessageText('');
                await refetchMessages();
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            } catch (e) {
                Alert.alert('Send failed', 'Could not send attachments');
            }
            return;
        }
        // Fallback: text only
        await handleSendMessage();
    };

    // Always scroll to latest when messages change
    React.useEffect(() => {
        if (!messagesLoading && messagesList.length > 0) {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 50);
        }
    }, [messagesLoading, messagesList.length]);

    // Mark all messages as read on focus/open
    React.useEffect(() => {
        let mounted = true;
        const run = async () => {
            try {
                const token = await getToken?.({ skipCache: true });
                if (token) apiService.setAuthToken(token);
                await apiService.markAllMessagesRead(id || '');
            } catch { }
        };
        if (id) run();
        return () => { mounted = false; };
    }, [id]);

    // Join/Leave conversation room for real-time updates
    React.useEffect(() => {
        if (!socket || !socket.connected || !id) return;

        joinConversationRoom(id);

        return () => {
            leaveConversationRoom(id);
        };
    }, [socket, id]);

    // Realtime: listen new messages
    React.useEffect(() => {
        if (!socket) return;
        const onNewMessage = (message: any) => {
            if (message?.conversation?.toString?.() === (id || '')) {
                refetchMessages();
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
            }
        };
        socket.on('new-message', onNewMessage);
        return () => {
            socket.off('new-message', onNewMessage);
        };
    }, [socket, id, refetchMessages]);

    // Realtime: listen typing indicators
    React.useEffect(() => {
        if (!socket || !id || !currentUserId) return;

        const onUserTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
            if (data.conversationId !== id || data.userId === currentUserId) return;

            setTypingUsers(prev => {
                const next = new Set(prev);
                if (data.isTyping) {
                    next.add(data.userId);
                } else {
                    next.delete(data.userId);
                }
                return next;
            });

            // Auto-clear typing after 3 seconds
            if (data.isTyping) {
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = setTimeout(() => {
                    setTypingUsers(prev => {
                        const next = new Set(prev);
                        next.delete(data.userId);
                        return next;
                    });
                }, 3000);
            }
        };

        socket.on('user-typing', onUserTyping);
        return () => {
            socket.off('user-typing', onUserTyping);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [socket, id, currentUserId]);

    // Send typing status when user types
    React.useEffect(() => {
        if (!id || !socket || !socket.connected) return;

        const timeout = setTimeout(() => {
            if (messageText.trim().length > 0) {
                sendTypingStatus(id, true);
            } else {
                sendTypingStatus(id, false);
            }
        }, 500); // Debounce typing events

        return () => {
            clearTimeout(timeout);
            if (messageText.trim().length === 0) {
                sendTypingStatus(id, false);
            }
        };
    }, [messageText, id, socket]);


    return (
        <SafeAreaView className='flex-1 bg-white'>
            {/* Header */}
            <ChatHeader
                conversationId={id || ''}
                conversation={conversation}
                currentUserId={currentUserId}
                messagesList={messagesList}
                conversationLoading={conversationLoading}
                // @ts-ignore pass-through for fallback group name
                fallbackName={fallbackName as any}
            />

            {/* Messages List */}
            <View className='flex-1'>
                {messagesLoading ? (
                    <View className='py-12 items-center'>
                        <ActivityIndicator size="large" color="#1DA1F2" />
                        <Text className='text-gray-500 text-sm mt-3 font-medium'>Loading messages...</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={scrollViewRef}
                        data={messagesList}
                        keyExtractor={(item: any, index) => item._id || String(index)}
                        renderItem={({ item, index }: ListRenderItemInfo<any>) => {
                            const isMe = item.sender?._id?.toString() === currentUserId?.toString() ||
                                item.sender?.toString() === currentUserId?.toString();
                            const prevMessage = index > 0 ? messagesList[index - 1] : null;
                            const showAvatar = !prevMessage ||
                                prevMessage?.sender?._id?.toString() !== item.sender?._id?.toString() ||
                                prevMessage?.sender?.toString() !== item.sender?.toString();
                            const showDate = !prevMessage ||
                                new Date(prevMessage.createdAt).toDateString() !== new Date(item.createdAt).toDateString();
                            const isTimeVisible = selectedMessageId === item._id?.toString();
                            return (
                                <MessageBubble
                                    message={item}
                                    isMe={isMe}
                                    showAvatar={showAvatar}
                                    showDate={showDate}
                                    isTimeVisible={isTimeVisible}
                                    onToggleTime={() => {
                                        setSelectedMessageId(isTimeVisible ? null : (item._id?.toString() || null));
                                    }}
                                    currentUserId={currentUserId}
                                />
                            );
                        }}
                        initialNumToRender={20}
                        maxToRenderPerBatch={20}
                        windowSize={7}
                        removeClippedSubviews
                        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps='handled'
                        onContentSizeChange={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 10)}
                    />
                )}
            </View>

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
                <TypingIndicator
                    typingUsers={Array.from(typingUsers)}
                    participantNames={(() => {
                        const names: Record<string, string> = {};
                        if (conversationData?.participants) {
                            conversationData.participants.forEach((p: any) => {
                                const userId = p.user?._id || p.user?.toString() || p.user;
                                const name = p.user?.firstName || p.user?.username || 'User';
                                if (userId) names[userId] = name;
                            });
                        }
                        return names;
                    })()}
                />
            )}

            {/* Attachments Preview (always visible) */}
            {pendingFiles.length > 0 && (
                <View className='bg-white' style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 12 }}
                    >
                        {pendingFiles.map((f) => (
                            <View key={f.uri} style={{ marginRight: 10 }}>
                                {f.kind === 'image' ? (
                                    <Image source={{ uri: f.uri }} style={{ width: 68, height: 68, borderRadius: 10 }} />
                                ) : (
                                    <View style={{ width: 68, height: 68, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                                        <Feather name={f.kind === 'video' ? 'video' : 'paperclip'} size={18} color="#6B7280" />
                                        {f.fileName ? (
                                            <Text numberOfLines={1} style={{ fontSize: 10, color: '#6B7280', marginTop: 4, maxWidth: 64 }}>{f.fileName}</Text>
                                        ) : null}
                                    </View>
                                )}
                                <TouchableOpacity
                                    onPress={() => handleRemovePending(f.uri)}
                                    style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Feather name='x' size={14} color='#fff' />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Input Bar */}
            <ChatInputBar
                messageText={messageText}
                setMessageText={setMessageText}
                onSend={handleSend}
                onAttach={handleAttach}
                attachments={pendingFiles}
                onRemoveAttachment={handleRemovePending}
            />
        </SafeAreaView>
    );
};

export default ChatDetailScreen;
