import { Stack } from 'expo-router'

export default function MessagesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen
                name="[id]"
                options={{
                    headerShown: false,
                    presentation: 'card',
                    animation: 'slide_from_right'
                }}
            />
        </Stack>
    )
}

