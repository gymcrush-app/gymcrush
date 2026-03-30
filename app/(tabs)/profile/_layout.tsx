import { Stack, useSegments } from "expo-router"

export default function ProfileLayout() {
  const segments = useSegments() as string[]
  const isSwiper = segments.includes('swiper')

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="playground"
        options={{
          title: 'Demo playground',
          headerShown: !isSwiper,
        }}
      />
    </Stack>
  )
}
