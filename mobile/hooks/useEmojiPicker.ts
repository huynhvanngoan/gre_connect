import { useState } from 'react';

export interface EmojiCategory {
    name: string;
    icon: string;
    emojis: string[];
}

export const emojiCategories: Record<string, EmojiCategory> = {
    smileys: {
        name: 'Smileys',
        icon: '😀',
        emojis: [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
            '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
            '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
            '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
            '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
            '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
            '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦',
            '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
            '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
            '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👍', '👎',
            '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '🤙', '👋',
            '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✍️', '💪', '🦾',
        ]
    },
    hearts: {
        name: 'Hearts',
        icon: '❤️',
        emojis: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
            '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
        ]
    },
    animals: {
        name: 'Animals',
        icon: '🐶',
        emojis: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
            '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
            '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
        ]
    },
    food: {
        name: 'Food',
        icon: '🍎',
        emojis: [
            '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑',
            '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒',
            '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨',
            '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔',
        ]
    },
    activities: {
        name: 'Activities',
        icon: '⚽',
        emojis: [
            '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
            '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '🥍', '🏹', '🎣', '🥊',
            '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️',
        ]
    },
    objects: {
        name: 'Objects',
        icon: '💡',
        emojis: [
            '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷',
            '💰', '💳', '💎', '⚖️', '🛠️', '🔨', '⚒️', '🛠️', '⛏️', '🔩',
            '⚙️', '🔫', '💣', '🧨', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '☠️',
        ]
    },
    symbols: {
        name: 'Symbols',
        icon: '❤️',
        emojis: [
            '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️',
            '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️',
            '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎',
            '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑',
        ]
    },
};

export const categoryKeys = Object.keys(emojiCategories);

export const useEmojiPicker = () => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('smileys');
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

    const addToRecentEmojis = (emoji: string) => {
        setRecentEmojis(prev => {
            const filtered = prev.filter(e => e !== emoji);
            return [emoji, ...filtered].slice(0, 20); // Keep last 20
        });
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(prev => !prev);
    };

    return {
        showEmojiPicker,
        setShowEmojiPicker,
        selectedCategory,
        setSelectedCategory,
        recentEmojis,
        addToRecentEmojis,
        toggleEmojiPicker,
    };
};

