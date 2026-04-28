import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function Chip({ label, selected, onPress, disabled = false, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        disabled && styles.chipDisabled,
        pressed && !disabled && styles.chipPressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  chipSelected: {
    backgroundColor: colors.secondary,
  },
  chipUnselected: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.manropeMedium,
  },
  chipTextSelected: {
    color: colors.secondaryForeground,
  },
  chipTextUnselected: {
    color: colors.foreground,
  },
});
