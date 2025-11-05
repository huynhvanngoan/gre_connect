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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    isMe,
    showAvatar,
    showDate,
    isTimeVisible,
    onToggleTime,
    currentUserId,
}) => {
    // Check if this is a call/system message
    const isCallMessage = message.type === 'system' && message.metadata?.callId;
    const callMetadata = message.metadata;
    const callType = callMetadata?.callType || 'voice';
    const callStatus = callMetadata?.callStatus || 'completed';
    const duration = callMetadata?.duration || 0;

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
                <View className='items-center my-3'>
                    <TouchableOpacity
                        onPress={onToggleTime}
                        activeOpacity={0.8}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F9FAFB',
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 3,
                            elevation: 2,
                            minWidth: 200,
                            maxWidth: '85%',
                        }}
                    >
                        {/* Call Icon */}
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: statusInfo.color + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                            }}
                        >
                            <Feather
                                name={callType === 'video' ? 'video' : statusInfo.icon as any}
                                size={20}
                                color={statusInfo.color}
                            />
                        </View>

                        {/* Call Info */}
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: '#111827',
                                        marginRight: 6,
                                    }}
                                >
                                    {callType === 'video' ? 'Video' : 'Voice'} Call
                                </Text>
                                <View
                                    style={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: 2,
                                        backgroundColor: statusInfo.color,
                                        marginRight: 6,
                                    }}
                                />
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '500',
                                        color: statusInfo.color,
                                    }}
                                >
                                    {statusInfo.text}
                                </Text>
                            </View>
                            {duration > 0 && (
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: '#6B7280',
                                        marginTop: 2,
                                    }}
                                >
                                    Duration: {formatDuration(duration)}
                                </Text>
                            )}
                            {isTimeVisible && (
                                <Text
                                    style={{
                                        fontSize: 11,
                                        color: '#9CA3AF',
                                        marginTop: 4,
                                    }}
                                >
                                    {new Date(message.createdAt).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
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

