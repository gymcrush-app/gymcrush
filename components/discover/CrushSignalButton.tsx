/**
 * "You are my gym crush" button with 1/day limit. Gradient primary styling.
 * TODO: Wire onPress, disabled state, and cooldown timer (check appStore.checkCrushAvailability, recordCrushSignal).
 */

import React from 'react';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/theme';

interface CrushSignalButtonProps {
  onPress: () => void;
  disabled: boolean;
  cooldownTime?: number;
}

export function CrushSignalButton({ onPress, disabled, cooldownTime }: CrushSignalButtonProps) {
  return (
    <LinearGradient
      colors={gradients.primary.colors}
      start={gradients.primary.start}
      end={gradients.primary.end}
      className="rounded-lg px-6 py-4"
    >
      <Text className="text-primary-foreground font-bold">You are my gym crush</Text>
    </LinearGradient>
  );
}
