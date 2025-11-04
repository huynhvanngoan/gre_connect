import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCreatePost } from '@/hooks/useCreatePost';
import { FormField, Selector } from '@/components/form';

const CreatePostScreen = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { loading, handleCreatePost: createPost } = useCreatePost();

    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [postType, setPostType] = useState('general');
    const [visibility, setVisibility] = useState('public');

    const handleSubmit = async () => {
        await createPost({
            content,
            tags,
            postType,
            visibility,
        });
    };

    return (
        <SafeAreaView className='flex-1 bg-white'>
            {/* Header */}
            <View
                className='flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200'
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 3,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className='p-2 rounded-full active:bg-gray-100'
                >
                    <Feather name='x' size={22} color="#1DA1F2" />
                </TouchableOpacity>

                <Text className='text-lg font-bold text-gray-900'>Create Post</Text>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading || !content.trim()}
                    className='px-4 py-2 rounded-full'
                    style={{
                        backgroundColor: loading || !content.trim() ? '#E5E7EB' : '#1DA1F2',
                    }}
                >
                    {loading ? (
                        <View className='px-2'>
                            <Text className='text-white font-semibold'>...</Text>
                        </View>
                    ) : (
                        <Text className='text-white font-semibold'>Post</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                className='flex-1'
                contentContainerStyle={{
                    padding: 16,
                    paddingBottom: 20 + insets.bottom,
                }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Content Input */}
                <FormField
                    label="Content"
                    value={content}
                    onChangeText={setContent}
                    placeholder="What's on your mind?"
                    multiline
                    numberOfLines={8}
                    maxLength={10000}
                    helperText={`${content.length}/10000 characters`}
                />

                {/* Tags Input */}
                <FormField
                    label="Tags (optional)"
                    value={tags}
                    onChangeText={setTags}
                    placeholder="#tag1 #tag2 (separated by spaces or commas)"
                    helperText="Add # before tags or they will be added automatically"
                />

                {/* Post Type */}
                <Selector
                    label="Post Type"
                    options={[
                        { value: 'general', label: 'General' },
                        { value: 'question', label: 'Question' },
                        { value: 'announcement', label: 'Announcement' },
                        { value: 'homework', label: 'Homework' },
                    ]}
                    value={postType}
                    onChange={setPostType}
                    activeColor="#1DA1F2"
                />

                {/* Visibility */}
                <Selector
                    label="Visibility"
                    options={[
                        { value: 'public', label: 'Public', icon: 'globe' },
                        { value: 'class', label: 'Class', icon: 'users' },
                        { value: 'private', label: 'Private', icon: 'lock' },
                    ]}
                    value={visibility}
                    onChange={setVisibility}
                    activeColor="#10B981"
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default CreatePostScreen;

