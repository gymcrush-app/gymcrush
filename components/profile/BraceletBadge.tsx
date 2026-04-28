import { BRACELET_OPTIONS } from '@/constants';
import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import type { BraceletStatus } from '@/types';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface BraceletBadgeProps {
  status: BraceletStatus;
  style?: ViewStyle;
}

const labelByStatus = Object.fromEntries(
  BRACELET_OPTIONS.map((o) => [o.value, o.label])
) as Record<BraceletStatus, string>;

const statusConfig: Record<BraceletStatus, { label: string; color: string; bgColor: string }> = {
  wearing: {
    label: labelByStatus.wearing,
    color: colors.bracelet.wearing,
    bgColor: `${colors.bracelet.wearing}20`, // 20% opacity
  },
  not_wearing: {
    label: labelByStatus.not_wearing,
    color: colors.bracelet.notWearing,
    bgColor: `${colors.bracelet.notWearing}20`,
  },
  no_bracelet: {
    label: labelByStatus.no_bracelet,
    color: colors.bracelet.none,
    bgColor: `${colors.bracelet.none}20`,
  },
};

export function BraceletBadge({ status, style }: BraceletBadgeProps) {
  const config = statusConfig[status];

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: config.color,
          },
        ]}
      />
      <Text style={styles.label}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  label: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.manropeMedium,
    color: colors.foreground,
  },
});
