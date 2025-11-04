import { View, TextInput, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

export interface SearchInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSubmitEditing?: () => void;
    placeholder?: string;
    showClearButton?: boolean;
    onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChangeText,
    onSubmitEditing,
    placeholder = 'Search...',
    showClearButton = true,
    onClear,
}) => {
    return (
        <View className='px-4 py-3 border-b border-gray-100'>
            <View className='flex-row items-center bg-gray-100 rounded-full px-4 py-3'>
                <Feather name='search' size={20} color="#657786" />
                <TextInput
                    placeholder={placeholder}
                    className='flex-1 ml-3 text-base'
                    placeholderTextColor="#657786"
                    value={value}
                    onChangeText={onChangeText}
                    onSubmitEditing={onSubmitEditing}
                    returnKeyType="search"
                />
                {showClearButton && value.length > 0 && (
                    <TouchableOpacity onPress={onClear || (() => onChangeText(''))}>
                        <Feather name='x' size={20} color="#657786" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

