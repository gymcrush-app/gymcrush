import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/theme';

interface CensoredPreviewProps {
  filtered: string;
  show: boolean;
}

/**
 * Shows how the text will appear after censoring (e.g. "This will appear as: ***").
 * Only render when show is true (user's input contains bad words).
 */
export function CensoredPreview({ filtered, show }: CensoredPreviewProps) {
  if (!show || !filtered) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.label}>This will appear as:</Text>
      <Text style={styles.preview}>{filtered}</Text>
      <Text style={styles.hint}>You can edit to replace censored words.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.muted + '40',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.mutedForeground,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: spacing[1],
  },
  preview: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
});
