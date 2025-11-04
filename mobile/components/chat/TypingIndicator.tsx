import { View, Text, Animated } from 'react-native';
import React, { useEffect, useRef } from 'react';

interface TypingIndicatorProps {
    typingUsers: string[];
    participantNames?: Record<string, string>; // userId -> name mapping
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
    typingUsers,
    participantNames = {}
}) => {
    const dot1 = useRef(new Animated.Value(0.3)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        if (typingUsers.length === 0) return;

        const animate = () => {
            const animations = [
                Animated.sequence([
                    Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.delay(150),
                    Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.delay(300),
                    Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                ]),
            ];

            Animated.loop(Animated.parallel(animations)).start();
        };

        animate();
    }, [typingUsers.length, dot1, dot2, dot3]);

    if (typingUsers.length === 0) return null;

    const names = typingUsers
        .map(id => participantNames[id] || 'Someone')
        .join(', ');

    return (
        <View className='flex-row items-center px-4 py-2'>
            <View className='flex-row items-center'>
                <View className='flex-row items-center mr-2' style={{ gap: 4 }}>
                    <Animated.View
                        className='rounded-full bg-gray-400'
                        style={{
                            width: 6,
                            height: 6,
                            opacity: dot1,
                        }}
                    />
                    <Animated.View
                        className='rounded-full bg-gray-400'
                        style={{
                            width: 6,
                            height: 6,
                            opacity: dot2,
                        }}
                    />
                    <Animated.View
                        className='rounded-full bg-gray-400'
                        style={{
                            width: 6,
                            height: 6,
                            opacity: dot3,
                        }}
                    />
                </View>
                <Text className='text-sm text-gray-500 italic'>
                    {typingUsers.length === 1
                        ? `${names} is typing...`
                        : `${names} are typing...`
                    }
                </Text>
            </View>
        </View>
    );
};

