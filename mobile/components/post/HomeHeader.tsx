import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { HomeHeaderProps } from './types';

export const HomeHeader: React.FC<HomeHeaderProps> = ({ onLogoPress }) => {
    return (
        <View
            className='px-4 pt-4 pb-3 bg-white'
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 3,
            }}
        >
            <View className='flex-row items-center justify-between'>
                <TouchableOpacity
                    onPress={onLogoPress}
                    className='flex-row items-center'
                    activeOpacity={0.7}
                >
                    <View
                        className='size-12 rounded-2xl mr-3 items-center justify-center'
                        style={{
                            backgroundColor: '#1DA1F2',
                            shadowColor: '#1DA1F2',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                            elevation: 4,
                        }}
                    >
                        <Feather name='compass' size={24} color="#FFFFFF" />
                    </View>
                    <View>
                        <Text className='text-2xl font-bold' style={{ color: '#111827' }}>Explore</Text>
                        <Text className='text-xs' style={{ color: '#9CA3AF', marginTop: -2 }}>GRE Connect</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

