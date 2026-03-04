import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, shadows, spacing, borderRadius, fontSize, fontWeight } from '@/theme';
import type { PressableProps } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDestructive: {
    backgroundColor: colors.destructive,
  },
  buttonSm: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  buttonMd: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  buttonLg: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
  textPrimary: {
    color: colors.primaryForeground,
  },
  textSecondary: {
    color: colors.secondaryForeground,
  },
  textOutline: {
    color: colors.foreground,
  },
  textGhost: {
    color: colors.foreground,
  },
  textDestructive: {
    color: colors.destructiveForeground,
  },
  textSm: {
    fontSize: fontSize.sm,
  },
  textMd: {
    fontSize: fontSize.base,
  },
  textLg: {
    fontSize: fontSize.lg,
  },
});

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  children,
  style,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const shadowStyle = isPrimary ? shadows.button : undefined;

  const buttonStyle: ViewStyle[] = [
    styles.button,
    styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles] as ViewStyle,
    styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles] as ViewStyle,
    (disabled || isLoading) && styles.buttonDisabled,
    shadowStyle,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.text,
    styles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles] as TextStyle,
    styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles] as TextStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyle,
        pressed && !disabled && !isLoading && { opacity: 0.8 },
      ]}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? colors.primaryForeground : colors.foreground} 
        />
      ) : (
        <Text style={textStyle}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}
