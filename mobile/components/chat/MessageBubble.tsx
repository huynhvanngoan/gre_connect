import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { Feather } from '@expo/vector-icons';

interface MessageBubbleProps {
    message: any;
    isMe: boolean;
    showAvatar: boolean;
    showDate: boolean;
    isTimeVisible: boolean;
    onToggleTime: () => void;
    currentUserId: string | null;
    conversationId?: string;
    conversationType?: 'direct' | 'group' | 'class';
    onCallPress?: (callType: 'voice' | 'video', conversationId?: string, recipientId?: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    isMe,
    showAvatar,
    showDate,
    isTimeVisible,
    onToggleTime,
    currentUserId,
    conversationId,
    conversationType,
    onCallPress,
}) => {
    // Check if this is a call/system message
    // Fallback: detect from content if metadata is missing
    const isCallMessage = message.type === 'system' && (
        message.metadata?.callId ||
        (message.content && /(voice|video)\s+call\s+(completed|missed|declined|cancelled)/i.test(message.content))
    );

    const callMetadata = message.metadata || {};

    // Extract call info from metadata or content
    let callType = callMetadata?.callType;
    let callStatus = callMetadata?.callStatus;
    let duration = callMetadata?.duration || 0;

    // If metadata is missing, try to parse from content
    if (!callType && message.content) {
        const contentLower = message.content.toLowerCase();
        callType = contentLower.includes('video') ? 'video' : 'voice';
    }

    // Default values
    callType = callType || 'voice';
    callStatus = callStatus || 'completed';

    // Extract duration from content if not in metadata
    if (!duration && message.content) {
        const durationMatch = message.content.match(/(\d{1,2}):(\d{2})/);
        if (durationMatch) {
            const minutes = parseInt(durationMatch[1], 10);
            const seconds = parseInt(durationMatch[2], 10);
            duration = minutes * 60 + seconds;
        }
    }

    // Format duration
    const formatDuration = (seconds: number) => {
        if (!seconds || seconds === 0) return '';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Get call status icon and color
    const getCallStatusInfo = () => {
        switch (callStatus) {
            case 'completed':
                return { icon: 'phone', color: '#10B981', text: 'Call ended' };
            case 'missed':
                return { icon: 'phone-missed', color: '#EF4444', text: 'Missed call' };
            case 'declined':
                return { icon: 'phone-off', color: '#F59E0B', text: 'Call declined' };
            case 'cancelled':
                return { icon: 'x-circle', color: '#6B7280', text: 'Call cancelled' };
            default:
                return { icon: 'phone', color: '#6B7280', text: 'Call' };
        }
    };

    const statusInfo = getCallStatusInfo();

    return (
        <View>
            {/* Date Separator */}
            {showDate && (
                <View className='items-center my-5'>
                    <View
                        className='bg-gray-100 px-4 py-1.5 rounded-full'
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                        }}
                    >
                        <Text className='text-xs text-gray-600 font-medium'>
                            {new Date(message.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>
                </View>
            )}

            {/* Call Message - Special styling */}
            {isCallMessage ? (
                <View
                    className={`flex-row mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                    {!isMe && (
                        <View className='mr-2'>
                            {showAvatar ? (
                                message.sender?.profilePicture ? (
                                    <ExpoImage
                                        source={{ uri: message.sender.profilePicture }}
                                        style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#E5E7EB' }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                    />
                                ) : (
                                    <View
                                        className='size-9 rounded-full items-center justify-center'
                                        style={{
                                            backgroundColor: '#F3F4F6',
                                            borderWidth: 2,
                                            borderColor: '#E5E7EB',
                                        }}
                                    >
                                        <Feather name='user' size={16} color="#6B7280" />
                                    </View>
                                )
                            ) : (
                                <View className='size-9' />
                            )}
                        </View>
                    )}

                    <View className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`} style={{ flexShrink: 1 }}>
                        {/* Sender Name */}
                        {!isMe && (
                            <Text className='text-xs text-gray-500 mb-1.5 px-2 font-medium'>
                                {message.sender?.firstName} {message.sender?.lastName || message.sender?.username || 'Unknown'}
                            </Text>
                        )}

                        <TouchableOpacity
                            onPress={() => {
                                // If call message and onCallPress is provided, handle call
                                if (isCallMessage && onCallPress) {
                                    onCallPress(callType as 'voice' | 'video', conversationId);
                                } else {
                                    onToggleTime();
                                }
                            }}
                            activeOpacity={isCallMessage && onCallPress ? 0.7 : 0.85}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#FFFFFF',
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                borderRadius: 16,
                                borderWidth: 1.5,
                                borderColor: statusInfo.color + '30',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.08,
                                shadowRadius: 4,
                                elevation: 3,
                                minWidth: 200,
                                maxWidth: '100%',
                            }}
                        >
                            {/* Call Icon with gradient background */}
                            <View
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: statusInfo.color + '20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 14,
                                    borderWidth: 1.5,
                                    borderColor: statusInfo.color + '40',
                                }}
                            >
                                <Feather
                                    name={callType === 'video' ? 'video' : statusInfo.icon as any}
                                    size={22}
                                    color={statusInfo.color}
                                    strokeWidth={2.5}
                                />
                            </View>

                            {/* Call Info */}
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                    <Text
                                        style={{
                                            fontSize: 15,
                                            fontWeight: '700',
                                            color: '#111827',
                                            letterSpacing: 0.2,
                                        }}
                                    >
                                        {callType === 'video' ? 'Video' : 'Voice'} Call
                                    </Text>
                                    <View
                                        style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: 2.5,
                                            backgroundColor: statusInfo.color,
                                            marginHorizontal: 8,
                                        }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: '600',
                                            color: statusInfo.color,
                                        }}
                                    >
                                        {statusInfo.text}
                                    </Text>
                                </View>
                                {duration > 0 ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                        <Feather name="clock" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                color: '#6B7280',
                                                fontWeight: '500',
                                            }}
                                        >
                                            {formatDuration(duration)}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: '#9CA3AF',
                                            marginTop: 2,
                                        }}
                                    >
                                        No duration
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Time and Read Receipt (shown when clicked) */}
                        {isTimeVisible && (
                            <View className='flex-row items-center'>
                                <Text
                                    className='text-xs text-gray-400 mt-1.5 px-2'
                                    style={{ fontWeight: '500' }}
                                >
                                    {new Date(message.createdAt).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </Text>
                                {/* Read Receipt (only for my messages) */}
                                {isMe && message.readBy && message.readBy.length > 0 && (
                                    <Feather
                                        name='check-circle'
                                        size={14}
                                        color="#1DA1F2"
                                        style={{ marginLeft: 4, marginTop: 1.5 }}
                                    />
                                )}
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <View
                    className={`flex-row mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                    {!isMe && (
                        <View className='mr-2'>
                            {showAvatar ? (
                                message.sender?.profilePicture ? (
                                    <ExpoImage
                                        source={{ uri: message.sender.profilePicture }}
                                        style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#E5E7EB' }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                    />
                                ) : (
                                    <View
                                        className='size-9 rounded-full items-center justify-center'
                                        style={{
                                            backgroundColor: '#F3F4F6',
                                            borderWidth: 2,
                                            borderColor: '#E5E7EB',
                                        }}
                                    >
                                        <Feather name='user' size={16} color="#6B7280" />
                                    </View>
                                )
                            ) : (
                                <View className='size-9' />
                            )}
                        </View>
                    )}

                    <View className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`} style={{ flexShrink: 1 }}>
                        {/* Sender Name */}
                        {!isMe && (
                            <Text className='text-xs text-gray-500 mb-1.5 px-2 font-medium'>
                                {message.sender?.firstName} {message.sender?.lastName || message.sender?.username || 'Unknown'}
                            </Text>
                        )}

                        <TouchableOpacity
                            onPress={onToggleTime}
                            activeOpacity={0.85}
                        >
                            <View
                                style={{
                                    flexShrink: 1,
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 18,
                                    backgroundColor: isMe ? '#1DA1F2' : '#F3F4F6',
                                    borderTopRightRadius: isMe ? 4 : 18,
                                    borderTopLeftRadius: isMe ? 18 : 4,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: isMe ? 0.1 : 0.05,
                                    shadowRadius: 2,
                                    elevation: 2,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 15,
                                        color: isMe ? '#FFFFFF' : '#111827',
                                        lineHeight: 20,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {message.content || '📎 Attachment'}
                                </Text>

                                {message.media && message.media.length > 0 && (
                                    <View style={{ marginTop: 8, gap: 8 }}>
                                        {message.media.map((media: any, idx: number) => {
                                            const mediaUrl = media.url || media.uri;
                                            const mediaType = media.type || media.mimeType || '';
                                            const fileName = media.fileName || media.filename || media.name || 'attachment';
                                            const isImage = mediaType.startsWith('image/') || (!mediaType && /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl || '')) || mediaType === 'image';
                                            const isVideo = mediaType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl || '') || mediaType === 'video';
                                            const isFile = !isImage && !isVideo;

                                            const handlePress = async () => {
                                                if (!mediaUrl) return;
                                                try {
                                                    const canOpen = await Linking.canOpenURL(mediaUrl);
                                                    if (canOpen) {
                                                        await Linking.openURL(mediaUrl);
                                                    } else {
                                                        Alert.alert('Unable to open', 'This file type cannot be opened directly.');
                                                    }
                                                } catch (error: any) {
                                                    Alert.alert('Error', error?.message || 'Failed to open file');
                                                }
                                            };

                                            if (isImage) {
                                                return (
                                                    <TouchableOpacity key={idx} onPress={handlePress} activeOpacity={0.9}>
                                                        <ExpoImage
                                                            source={{ uri: mediaUrl }}
                                                            style={{ width: 192, height: 192, borderRadius: 12 }}
                                                            contentFit="cover"
                                                            cachePolicy="memory-disk"
                                                            placeholder={require('@/assets/images/icon.png')}
                                                            transition={200}
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            } else if (isVideo) {
                                                return (
                                                    <TouchableOpacity
                                                        key={idx}
                                                        onPress={handlePress}
                                                        activeOpacity={0.9}
                                                        style={{
                                                            width: 192,
                                                            height: 192,
                                                            borderRadius: 12,
                                                            backgroundColor: '#000',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <Feather name="play-circle" size={48} color="#fff" />
                                                        <Text className="text-white text-xs mt-2" numberOfLines={1}>
                                                            {fileName}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            } else {
                                                // File attachment
                                                return (
                                                    <TouchableOpacity
                                                        key={idx}
                                                        onPress={handlePress}
                                                        activeOpacity={0.7}
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            padding: 12,
                                                            borderRadius: 8,
                                                            backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                                                            borderWidth: 1,
                                                            borderColor: isMe ? 'rgba(255,255,255,0.3)' : '#E5E7EB',
                                                        }}
                                                    >
                                                        <Feather
                                                            name="paperclip"
                                                            size={20}
                                                            color={isMe ? '#fff' : '#6B7280'}
                                                        />
                                                        <View className="flex-1 ml-3">
                                                            <Text
                                                                numberOfLines={1}
                                                                style={{
                                                                    fontSize: 14,
                                                                    color: isMe ? '#fff' : '#111827',
                                                                    fontWeight: '500',
                                                                }}
                                                            >
                                                                {fileName}
                                                            </Text>
                                                            {media.fileSize && (
                                                                <Text
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: isMe ? 'rgba(255,255,255,0.7)' : '#6B7280',
                                                                        marginTop: 2,
                                                                    }}
                                                                >
                                                                    {(media.fileSize / 1024).toFixed(1)} KB
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <Feather
                                                            name="download"
                                                            size={18}
                                                            color={isMe ? '#fff' : '#1DA1F2'}
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            }
                                        })}
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Time and Read Receipt (shown when clicked) */}
                        {isTimeVisible && (
                            <View className='flex-row items-center'>
                                <Text
                                    className='text-xs text-gray-400 mt-1.5 px-2'
                                    style={{ fontWeight: '500' }}
                                >
                                    {new Date(message.createdAt).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </Text>
                                {/* Read Receipt (only for my messages) */}
                                {isMe && message.readBy && message.readBy.length > 0 && (
                                    <Feather
                                        name='check-circle'
                                        size={14}
                                        color="#1DA1F2"
                                        style={{ marginLeft: 4, marginTop: 1.5 }}
                                    />
                                )}
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
};

// Memoize to prevent unnecessary re-renders when list scrolls
export const MemoMessageBubble = React.memo(MessageBubble);

