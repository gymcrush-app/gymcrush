import { Stack } from 'expo-router'

export default function PlaygroundLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Demo playground',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="haptics"
        options={{
          title: 'Haptic feedback',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="swiper"
        options={{
          title: 'Discover swiper',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="modals"
        options={{
          title: 'Modal demos',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="empty-states"
        options={{
          title: 'Empty states',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="active-toasts"
        options={{
          title: 'Active toasts',
          headerShown: true,
        }}
      />
    </Stack>
  )
}
