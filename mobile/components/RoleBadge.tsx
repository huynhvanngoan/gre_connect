import { View, Text } from 'react-native';
import React from 'react';
import { Feather } from '@expo/vector-icons';

interface RoleBadgeProps {
    role?: string;
}

const ROLE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; icon: string; iconColor: string }> = {
    teacher: { label: 'Teacher', bgColor: 'bg-blue-100', textColor: 'text-blue-700', icon: 'book-open', iconColor: '#1e40af' },
    admin: { label: 'Admin', bgColor: 'bg-red-100', textColor: 'text-red-700', icon: 'shield', iconColor: '#b91c1c' },
    staff: { label: 'Staff', bgColor: 'bg-orange-100', textColor: 'text-orange-700', icon: 'briefcase', iconColor: '#c2410c' },
    student: { label: 'Student', bgColor: 'bg-green-100', textColor: 'text-green-700', icon: 'user', iconColor: '#15803d' },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
    if (!role) return null;

    const roleLower = role.toLowerCase();
    const config = ROLE_CONFIG[roleLower];
    if (!config) return null;

    return (
        <View className={`${config.bgColor} px-2 py-0.5 rounded-full ml-2 flex-row items-center`}>
            <Feather name={config.icon as any} size={10} color={config.iconColor} />
            <Text className={`${config.textColor} text-xs font-medium ml-1`}>
                {config.label}
            </Text>
        </View>
    );
};

