import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

export type TabType = 'direct' | 'group' | 'class';

interface Tab {
    key: TabType;
    label: string;
    icon: string;
}

export interface TabBarProps {
    tabs: Tab[];
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <View
            className='flex-row bg-white'
            style={{
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
            }}
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => onTabChange(tab.key)}
                        className='flex-1 py-4 items-center justify-center relative'
                        activeOpacity={0.7}
                    >
                        <View className='flex-row items-center justify-center'>
                            <View
                                className='p-1.5 rounded-lg mr-2'
                                style={{
                                    backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                                }}
                            >
                                <Feather
                                    name={tab.icon as any}
                                    size={18}
                                    color={isActive ? "#1DA1F2" : "#9CA3AF"}
                                />
                            </View>
                            <Text
                                className='font-semibold text-sm'
                                style={{
                                    color: isActive ? '#1DA1F2' : '#9CA3AF',
                                    fontWeight: isActive ? '600' : '500',
                                }}
                            >
                                {tab.label}
                            </Text>
                        </View>
                        {isActive && (
                            <View
                                className='absolute bottom-0 left-0 right-0 rounded-t-full'
                                style={{
                                    height: 3,
                                    backgroundColor: '#1DA1F2',
                                }}
                            />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

