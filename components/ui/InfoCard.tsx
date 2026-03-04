import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, borderRadius, spacing, fontSize } from '@/theme';

export type InfoCardVariant = 'info' | 'error' | 'success';

interface InfoCardProps {
  variant: InfoCardVariant;
  title?: string;
  message: string;
  style?: ViewStyle | ViewStyle[];
}

const variantStyles: Record<InfoCardVariant, { borderLeftColor: string }> = {
  error: { borderLeftColor: colors.destructive },
  info: { borderLeftColor: colors.primary },
  success: { borderLeftColor: colors.success },
};

export function InfoCard({ variant, title, message, style }: InfoCardProps) {
  const accentStyle = variantStyles[variant];

  return (
    <View style={[styles.card, accentStyle, style]}>
      {title ? (
        <Text variant="bodySmall" weight="semibold" color="default" style={styles.title}>
          {title}
        </Text>
      ) : null}
      <Text variant="bodySmall" color="default" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderLeftWidth: 4,
  },
  title: {
    marginBottom: spacing[1],
  },
  message: {
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
});
