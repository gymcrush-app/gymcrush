import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="request/[senderId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="[matchId]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
