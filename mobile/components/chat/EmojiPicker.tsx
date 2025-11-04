import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React, { useRef } from 'react';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEmojiPicker, emojiCategories, categoryKeys } from '@/hooks/useEmojiPicker';

interface EmojiPickerProps {
    messageText: string;
    onEmojiSelect: (emoji: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
    messageText,
    onEmojiSelect,
    onDelete,
    onClose,
}) => {
    const insets = useSafeAreaInsets();
    const emojiScrollRef = useRef<ScrollView>(null);
    const { selectedCategory, setSelectedCategory, recentEmojis, addToRecentEmojis } = useEmojiPicker();

    const handleEmojiPress = (emoji: string) => {
        onEmojiSelect(emoji);
        addToRecentEmojis(emoji);
    };

    return (
        <View
            style={{
                backgroundColor: '#fff',
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                maxHeight: 300,
                paddingBottom: insets.bottom,
            }}
        >
            {/* Header with Delete Button */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                }}
            >
                {/* Delete Button */}
                <TouchableOpacity
                    onPress={onDelete}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: messageText.length > 0 ? '#F3F4F6' : '#FAFAFA',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                    disabled={messageText.length === 0}
                >
                    <Feather
                        name='delete'
                        size={20}
                        color={messageText.length > 0 ? "#1DA1F2" : "#D1D5DB"}
                    />
                </TouchableOpacity>

                {/* Category Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingHorizontal: 4,
                        alignItems: 'center',
                    }}
                >
                    {categoryKeys.map((key) => {
                        const category = emojiCategories[key];
                        const isActive = selectedCategory === key;
                        return (
                            <TouchableOpacity
                                key={key}
                                onPress={() => {
                                    setSelectedCategory(key);
                                    emojiScrollRef.current?.scrollTo({ y: 0, animated: true });
                                }}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    marginHorizontal: 4,
                                    borderRadius: 8,
                                    backgroundColor: isActive ? '#E3F2FD' : 'transparent',
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 26 }}>{category.icon}</Text>
                                {isActive && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            bottom: 2,
                                            left: '50%',
                                            marginLeft: -8,
                                            width: 16,
                                            height: 3,
                                            backgroundColor: '#1DA1F2',
                                            borderRadius: 2,
                                        }}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Close Button */}
                <TouchableOpacity
                    onPress={onClose}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: '#F3F4F6',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                >
                    <Feather name='x' size={18} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {/* Emoji Grid */}
            <ScrollView
                ref={emojiScrollRef}
                style={{ maxHeight: 240 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    padding: 10,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {/* Recent Emojis Section */}
                {recentEmojis.length > 0 && selectedCategory === 'smileys' && (
                    <>
                        <View style={{ width: '100%', marginBottom: 8, paddingHorizontal: 4 }}>
                            <Text className='text-xs font-semibold text-gray-500 mb-2'>Gần đây</Text>
                        </View>
                        {recentEmojis.map((emoji, index) => (
                            <TouchableOpacity
                                key={`recent-${index}`}
                                onPress={() => handleEmojiPress(emoji)}
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 8,
                                    backgroundColor: 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: 3,
                                }}
                                activeOpacity={0.6}
                            >
                                <Text style={{ fontSize: 26 }}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                        <View style={{ width: '100%', marginVertical: 4, paddingHorizontal: 4 }}>
                            <Text className='text-xs font-semibold text-gray-500 mb-2'>
                                {emojiCategories[selectedCategory]?.name}
                            </Text>
                        </View>
                    </>
                )}

                {/* Category Emojis */}
                {emojiCategories[selectedCategory]?.emojis.map((emoji, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleEmojiPress(emoji)}
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 8,
                            backgroundColor: 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: 3,
                        }}
                        activeOpacity={0.6}
                    >
                        <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

