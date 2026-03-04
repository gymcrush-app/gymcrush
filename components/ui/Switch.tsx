import { borderRadius, colors } from '@/theme';
import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function Switch({
  value,
  onValueChange,
  disabled = false,
  style,
}: SwitchProps) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={style}
    >
      <View
        style={[
          styles.track,
          value ? styles.trackOn : styles.trackOff,
          disabled && styles.trackDisabled,
        ]}
      >
        <View
          style={[
            styles.thumb,
            value ? styles.thumbOn : styles.thumbOff,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44, // w-11 = 44px
    height: 24, // h-6 = 24px
    borderRadius: borderRadius.full,
    position: 'relative',
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  trackOff: {
    backgroundColor: colors.muted,
  },
  trackDisabled: {
    opacity: 0.5,
  },
  thumb: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.foreground,
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbOn: {
    right: 2,
  },
  thumbOff: {
    left: 2,
  },
});
