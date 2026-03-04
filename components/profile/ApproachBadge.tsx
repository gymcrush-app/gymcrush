/**
 * Pill badge displaying the "Approach me" prompt. Primary styling, rounded-full.
 */

import React from 'react';
import { View, Text } from 'react-native';

interface ApproachBadgeProps {
  prompt: string;
}

export function ApproachBadge({ prompt }: ApproachBadgeProps) {
  return (
    <View className="bg-primary rounded-full px-4 py-2">
      <Text className="text-primary-foreground font-medium text-sm">
        Approach me: {prompt}
      </Text>
    </View>
  );
}
