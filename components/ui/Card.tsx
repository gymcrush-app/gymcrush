import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, shadows, borderRadius, spacing } from '@/theme';
import type { ViewProps, PressableProps } from 'react-native';

interface CardProps extends Omit<ViewProps, 'children'> {
  children: React.ReactNode;
  pressable?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius['3xl'],
    padding: spacing[4],
  },
});

export function Card({
  children,
  pressable = false,
  onPress,
  style,
  ...props
}: CardProps) {
  if (pressable && onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed ? shadows.cardHover : shadows.card,
          style,
        ]}
        onPress={onPress}
        {...(props as PressableProps)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.card, shadows.card, style]}
      {...props}
    >
      {children}
    </View>
  );
}
