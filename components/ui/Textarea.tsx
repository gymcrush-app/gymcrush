import React, { forwardRef, useState } from 'react';
import { TextInput, Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/theme';
import type { TextInputProps } from 'react-native';

interface TextareaProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  style?: ViewStyle | ViewStyle[];
  maxLength?: number;
  showCharCount?: boolean;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing[1],
  },
  inputContainer: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 96, // min-h-24 = 96px
  },
  inputContainerFocused: {
    borderColor: colors.primary,
  },
  inputContainerUnfocused: {
    borderColor: colors.border,
  },
  inputContainerError: {
    borderColor: colors.destructive,
  },
  input: {
    color: colors.foreground,
    fontSize: fontSize.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  error: {
    color: colors.destructive,
    fontSize: fontSize.xs,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
});

export const Textarea = forwardRef<TextInput, TextareaProps>(({
  label,
  error,
  style,
  maxLength,
  showCharCount = false,
  value,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          isFocused ? styles.inputContainerFocused : styles.inputContainerUnfocused,
          error && styles.inputContainerError,
        ]}
      >
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.mutedForeground}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline
          textAlignVertical="top"
          maxLength={maxLength}
          value={value}
          {...props}
        />
      </View>
      {(error || (showCharCount && maxLength)) && (
        <View style={styles.footer}>
          {error && (
            <Text style={styles.error}>{error}</Text>
          )}
          {showCharCount && maxLength && (
            <Text style={styles.charCount}>
              {currentLength}/{maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

Textarea.displayName = 'Textarea';
