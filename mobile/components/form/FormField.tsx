import { View, Text, TextInput } from 'react-native';
import React from 'react';

export interface FormFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    numberOfLines?: number;
    maxLength?: number;
    helperText?: string;
    error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    numberOfLines = 1,
    maxLength,
    helperText,
    error,
}) => {
    return (
        <View className='mb-4'>
            <Text className='text-sm font-semibold text-gray-700 mb-2'>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                multiline={multiline}
                numberOfLines={numberOfLines}
                maxLength={maxLength}
                style={{
                    fontSize: multiline ? 16 : 14,
                    color: '#111827',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    padding: multiline ? 16 : 12,
                    minHeight: multiline ? 150 : undefined,
                    textAlignVertical: multiline ? 'top' : 'center',
                    borderWidth: 1,
                    borderColor: error ? '#EF4444' : '#E5E7EB',
                }}
            />
            {maxLength && (
                <Text className='text-xs text-gray-500 mt-2 text-right'>
                    {value.length}/{maxLength}
                </Text>
            )}
            {helperText && !error && (
                <Text className='text-xs text-gray-500 mt-2'>{helperText}</Text>
            )}
            {error && (
                <Text className='text-xs text-red-500 mt-2'>{error}</Text>
            )}
        </View>
    );
};

