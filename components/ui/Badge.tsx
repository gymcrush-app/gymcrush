import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '@/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md';
  style?: ViewStyle | ViewStyle[];
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
  },
  badgeMd: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  badgeDefault: {
    backgroundColor: colors.muted,
  },
  badgePrimary: {
    backgroundColor: colors.primary,
  },
  badgeSecondary: {
    backgroundColor: colors.secondary,
  },
  badgeSuccess: {
    backgroundColor: colors.success,
  },
  badgeWarning: {
    backgroundColor: colors.warning,
  },
  badgeDestructive: {
    backgroundColor: colors.destructive,
  },
  text: {
    fontWeight: fontWeight.medium,
  },
  textSm: {
    fontSize: fontSize.xs,
  },
  textMd: {
    fontSize: fontSize.sm,
  },
  textDefault: {
    color: colors.mutedForeground,
  },
  textPrimary: {
    color: colors.primaryForeground,
  },
  textSecondary: {
    color: colors.secondaryForeground,
  },
  textSuccess: {
    color: colors.successForeground,
  },
  textWarning: {
    color: colors.warningForeground,
  },
  textDestructive: {
    color: colors.destructiveForeground,
  },
});

export function Badge({ children, variant = 'default', size = 'md', style }: BadgeProps) {
  const badgeStyle: ViewStyle[] = [
    styles.badge,
    styles[`badge${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles] as ViewStyle,
    styles[`badge${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles] as ViewStyle,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.text,
    styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles] as TextStyle,
    styles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles] as TextStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <View style={badgeStyle}>
      <Text style={textStyle}>{children}</Text>
    </View>
  );
}
