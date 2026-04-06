import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right'
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="basic-info" />
      <Stack.Screen name="religion" />
      <Stack.Screen name="vices" />
      <Stack.Screen name="kids" />
      <Stack.Screen name="intent" />
      <Stack.Screen name="select-home-gym" />
      <Stack.Screen name="fitness" />
      <Stack.Screen name="frequency" />
      <Stack.Screen name="gym-preferences" />
      <Stack.Screen name="prompt-section" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
