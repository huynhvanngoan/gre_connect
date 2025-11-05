import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React, { useMemo, useCallback } from 'react';
import { Feather } from '@expo/vector-icons';

interface PostTagsProps {
    tags?: string[];
    onTagPress?: (tag: string) => void;
}

const PostTagsComponent: React.FC<PostTagsProps> = ({ tags, onTagPress }) => {
    // Early return if no tags
    if (!tags || tags.length === 0) {
        return null;
    }

    // Memoize tag items
    const tagItems = useMemo(() => {
        return tags.map((tag, index) => (
            <TouchableOpacity
                key={`${tag}-${index}`}
                style={styles.tag}
                onPress={() => onTagPress?.(tag)}
                activeOpacity={0.7}
            >
                <Feather name="tag" size={12} color="#6366F1" />
                <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
        ));
    }, [tags, onTagPress]);

    return (
        <View style={styles.container}>
            <View style={styles.tagsContainer}>
                {tagItems}
            </View>
        </View>
    );
};

// Memoize component
export const PostTags = React.memo(PostTagsComponent, (prevProps, nextProps) => {
    const prevTags = prevProps.tags?.join(',') || '';
    const nextTags = nextProps.tags?.join(',') || '';
    return prevTags === nextTags;
});

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 4,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    tagText: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '500',
    },
});

