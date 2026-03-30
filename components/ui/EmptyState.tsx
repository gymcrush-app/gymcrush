import { Text } from '@/components/ui/Text';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export interface EmptyStateProps {
  /** Icon to show (e.g. <Compass size={48} color={colors.mutedForeground} />) */
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Optional action (e.g. Button or custom content) */
  action?: React.ReactNode;
  /** Icon container size; default 96 for large icons, use "sm" for 80px */
  iconSize?: 'default' | 'sm';
  /** Use a larger, rounded-rect container for images/logos (e.g. heart) so they are not cropped by the circle */
  iconVariant?: 'default' | 'image';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  iconContainerSm: {
    width: 80,
    height: 80,
    marginBottom: spacing[4],
  },
  iconContainerImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing[6],
    backgroundColor: 'transparent',
  },
  titleImageVariant: {
    textAlign: 'center',
    maxWidth: 280,
  },
  title: {
    marginBottom: spacing[2],
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  descriptionImageVariant: {
    maxWidth: 300,
    marginBottom: spacing[10],
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing[8],
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
});

export function EmptyState({
  icon,
  title,
  description,
  action,
  iconSize = 'default',
  iconVariant = 'default',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          iconSize === 'sm' && styles.iconContainerSm,
          iconVariant === 'image' && styles.iconContainerImage,
        ]}
      >
        {icon}
      </View>
      <Text
        variant="h2"
        style={[
          styles.title,
          ...(iconVariant === 'image' ? [styles.titleImageVariant] : []),
        ]}
      >
        {title}
      </Text>
      <Text
        variant="muted"
        style={[
          styles.description,
          ...(iconVariant === 'image' ? [styles.descriptionImageVariant] : []),
        ]}
      >
        {description}
      </Text>
      {action}
    </View>
  );
}
