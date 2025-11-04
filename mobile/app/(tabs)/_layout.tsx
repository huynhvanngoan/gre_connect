import { View, Text } from 'react-native'
import React from 'react'
import { Redirect, Tabs } from 'expo-router'
import { Feather } from "@expo/vector-icons"
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/clerk-expo'
import AutoSyncUser from '@/components/AutoSyncUser'

const TabsLayout = () => {
    const insets = useSafeAreaInsets();
    const { isSignedIn } = useAuth();
    if (!isSignedIn) return <Redirect href="/(auth)" />
    return (
        <>
            <AutoSyncUser />
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: "#1DA1F2",
                    tabBarInactiveTintColor: "#657786",
                    tabBarStyle: {
                        backgroundColor: "#fff",
                        borderTopWidth: 1,
                        borderTopColor: "#E1E8ED",
                        height: 50 + insets.bottom,
                        padding: 8,
                    },
                    headerShown: false,
                    // tabBarLabelStyle: {
                    //     fontSize: 25,
                    //     fontWeight: "500",
                    // }
                }}>
                <Tabs.Screen name='index' options={{ title: "", tabBarIcon: ({ color, size }) => <Feather name="compass" size={size} color={color} /> }} />
                <Tabs.Screen name='search' options={{ title: "", tabBarIcon: ({ color, size }) => <Feather name="search" size={size} color={color} /> }} />
                <Tabs.Screen
                    name='messages'
                    options={{
                        title: "",
                        tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} />
                    }}
                />
                <Tabs.Screen name='notifications' options={{ title: "", tabBarIcon: ({ color, size }) => <Feather name="bell" size={size} color={color} /> }} />
                <Tabs.Screen name='profile' options={{ title: "", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
                <Tabs.Screen
                    name='create-post'
                    options={{
                        href: null, // Hide from tab bar
                        headerShown: false,
                    }}
                />
            </Tabs>
        </>
    )
}

export default TabsLayout