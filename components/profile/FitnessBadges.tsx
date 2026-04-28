/**
 * Row of fitness discipline badges. Horizontal chips with primary (peach) styling.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fontSize, fontFamily, spacing } from '@/theme';

interface FitnessBadgesProps {
  disciplines: string[];
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  chipText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.manropeMedium,
    color: colors.primaryForeground,
  },
});

export function FitnessBadges({ disciplines }: FitnessBadgesProps) {
  return (
    <View style={styles.row}>
      {disciplines.map((discipline, index) => (
        <View key={index} style={styles.chip}>
          <Text style={styles.chipText}>{discipline}</Text>
        </View>
      ))}
    </View>
  );
}
