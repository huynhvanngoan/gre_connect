import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmojiPicker } from './EmojiPicker';
import { useEmojiPicker } from '@/hooks/useEmojiPicker';

interface ChatInputBarProps {
    messageText: string;
    setMessageText: React.Dispatch<React.SetStateAction<string>>;
    onSend: () => void;
    onAttach: () => void;
    attachments?: Array<{ uri: string; mimeType?: string; fileName?: string; kind: 'image' | 'video' | 'file' }>;
    onRemoveAttachment?: (uri: string) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
    messageText,
    setMessageText,
    onSend,
    onAttach,
    attachments = [],
    onRemoveAttachment,
}) => {
    const insets = useSafeAreaInsets();
    const { showEmojiPicker, setShowEmojiPicker } = useEmojiPicker();

    const handleEmojiToggle = () => {
        Keyboard.dismiss();
        setShowEmojiPicker(!showEmojiPicker);
    };

    const handleEmojiSelect = (emoji: string) => {
        setMessageText((prev: string) => prev + emoji);
    };

    const handleDelete = () => {
        if (messageText.length > 0) {
            setMessageText(messageText.slice(0, -1));
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Preview handled at screen level */}

            <View
                className='flex-row items-end px-3 py-2 bg-white'
                style={{
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 5,
                }}
            >
                {/* No inline thumbnails here */}

                {/* Attach Button */}
                <TouchableOpacity
                    onPress={onAttach}
                    className='mr-2 rounded-full'
                    style={{
                        width: 40,
                        height: 40,
                        backgroundColor: '#F3F4F6',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                >
                    <Feather name='paperclip' size={22} color="#1DA1F2" />
                </TouchableOpacity>

                {/* Input Field */}
                <View
                    className='flex-1 bg-gray-50 rounded-full px-4'
                    style={{
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        minHeight: 44,
                        maxHeight: 100,
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <TextInput
                        value={messageText}
                        onChangeText={setMessageText}
                        placeholder='Type a message...'
                        placeholderTextColor="#9CA3AF"
                        style={{
                            fontSize: 16,
                            color: '#111827',
                            paddingVertical: 10,
                            paddingHorizontal: 0,
                            maxHeight: 80,
                            textAlignVertical: 'center',
                        }}
                        multiline
                        maxLength={1000}
                        returnKeyType="default"
                        blurOnSubmit={false}
                        onSubmitEditing={messageText.trim() ? onSend : undefined}
                        scrollEnabled={true}
                        numberOfLines={1}
                        onFocus={() => {
                            if (showEmojiPicker) {
                                setShowEmojiPicker(false);
                            }
                        }}
                    />
                </View>

                {/* Emoji Button (when no text) or Send Button (when has text) */}
                {messageText.trim() ? (
                    <TouchableOpacity
                        onPress={onSend}
                        className='ml-2 rounded-full'
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: '#1DA1F2',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#1DA1F2',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                        activeOpacity={0.8}
                    >
                        <Feather name='send' size={18} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={handleEmojiToggle}
                        className='ml-2 rounded-full'
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: showEmojiPicker ? '#E3F2FD' : '#F3F4F6',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        activeOpacity={0.7}
                    >
                        <Feather name='smile' size={22} color="#1DA1F2" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <EmojiPicker
                    messageText={messageText}
                    onEmojiSelect={handleEmojiSelect}
                    onDelete={handleDelete}
                    onClose={() => setShowEmojiPicker(false)}
                />
            )}
        </KeyboardAvoidingView>
    );
};

