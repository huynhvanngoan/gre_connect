import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

export interface SelectorOption<T> {
    value: T;
    label: string;
    icon?: string;
}

export interface SelectorProps<T> {
    label: string;
    options: SelectorOption<T>[];
    value: T;
    onChange: (value: T) => void;
    activeColor?: string;
    inactiveColor?: string;
}

export const Selector = <T extends string>({
    label,
    options,
    value,
    onChange,
    activeColor = '#1DA1F2',
    inactiveColor = '#F3F4F6',
}: SelectorProps<T>) => {
    return (
        <View className='mb-4'>
            <Text className='text-sm font-semibold text-gray-700 mb-2'>{label}</Text>
            <View className='flex-row flex-wrap gap-2'>
                {options.map((option) => {
                    const isActive = value === option.value;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            className='px-4 py-2 rounded-full'
                            style={{
                                backgroundColor: isActive ? activeColor : inactiveColor,
                            }}
                        >
                            <View className='flex-row items-center'>
                                {option.icon && (
                                    <Feather
                                        name={option.icon as any}
                                        size={14}
                                        color={isActive ? '#fff' : '#6B7280'}
                                        style={{ marginRight: 6 }}
                                    />
                                )}
                                <Text
                                    style={{
                                        color: isActive ? '#fff' : '#6B7280',
                                        fontWeight: isActive ? '600' : '400',
                                        fontSize: 14,
                                    }}
                                >
                                    {option.label}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

