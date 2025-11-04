import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { apiService } from '@/services/api';

interface CreatePostData {
    content: string;
    tags?: string;
    postType?: string;
    visibility?: string;
}

interface UseCreatePostReturn {
    loading: boolean;
    handleCreatePost: (data: CreatePostData) => Promise<void>;
}

export const useCreatePost = (): UseCreatePostReturn => {
    const router = useRouter();
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleCreatePost = async (data: CreatePostData) => {
        if (!data.content.trim()) {
            Alert.alert('Error', 'Please enter some content');
            return;
        }

        setLoading(true);

        try {
            const token = await getToken?.();
            if (token) {
                apiService.setAuthToken(token);
            }

            // Parse tags (comma or space separated)
            const tagsArray = data.tags
                ?.split(/[,\s]+/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0 && tag.startsWith('#'))
                .map(tag => tag.replace(/^#/, '')) || [];

            const payload: any = {
                content: data.content.trim(),
                postType: data.postType || 'general',
                visibility: data.visibility || 'public',
            };

            if (tagsArray.length > 0) {
                payload.tags = tagsArray;
            }

            const response = await apiService.createPost(payload);

            if (response.success) {
                router.back();
                setTimeout(() => {
                    Alert.alert('Success', 'Post created successfully!');
                }, 300);
            } else {
                const errorMsg = response.error || response.message || 'Failed to create post';
                Alert.alert('Error', errorMsg);
            }
        } catch (error: any) {
            console.error('Create post exception:', error);
            Alert.alert('Error', error.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        handleCreatePost,
    };
};

