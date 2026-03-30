/**
 * Pill badge with icon + label. Primary (peach) styling, rounded-full.
 */

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';

export interface PillBadgeProps {
  icon: React.ReactNode;
  label: string;
  style?: ViewStyle;
}

export function PillBadge({ icon, label, style }: PillBadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      <View style={styles.badgeContent}>
        {icon}
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginLeft: spacing[1],
  },
});
