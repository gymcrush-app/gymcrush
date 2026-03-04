import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right'
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="basic-info" />
      <Stack.Screen name="intent" />
      <Stack.Screen name="fitness" />
      <Stack.Screen name="frequency" />
      <Stack.Screen name="gym-preferences" />
      <Stack.Screen name="prompts" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="approach-prompt" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
