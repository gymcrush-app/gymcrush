import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme';

export interface UnreadDotProps {
  /** When false, dot is not rendered. */
  visible?: boolean;
  /** Size in logical pixels. Default 10. */
  size?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Small peach "new" / unread indicator dot. Use inside a positioned container
 * (e.g. avatarContainer with position: 'relative') for top-right placement.
 */
export function UnreadDot({ visible = true, size = 10, style }: UnreadDotProps) {
  if (!visible) return null;
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
  },
});
