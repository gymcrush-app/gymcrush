/**
 * Row of fitness discipline badges. Horizontal chips with secondary styling.
 */

import React from 'react';
import { View, Text } from 'react-native';

interface FitnessBadgesProps {
  disciplines: string[];
}

export function FitnessBadges({ disciplines }: FitnessBadgesProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {disciplines.map((discipline, index) => (
        <View key={index} className="bg-secondary rounded-full px-3 py-1">
          <Text className="text-secondary-foreground font-medium text-xs">
            {discipline}
          </Text>
        </View>
      ))}
    </View>
  );
}
