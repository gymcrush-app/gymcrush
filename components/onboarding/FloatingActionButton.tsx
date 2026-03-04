import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import type { PressableProps } from 'react-native';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface FloatingActionButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export function FloatingActionButton({
  children,
  style,
  ...buttonProps
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          bottom: insets.bottom,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Gradient background fade */}
      <LinearGradient
        colors={['transparent', colors.background]}
        locations={[0, 1]}
        pointerEvents="none"
      />
      
      {/* Button */}
      <View style={styles.buttonContainer}>
        <Button
          variant="primary"
          size="lg"
          style={style ? [styles.button, style as ViewStyle] : styles.button}
          {...buttonProps}
        >
          {children}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  buttonContainer: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[6],
  },
  button: {
    width: '100%',
  },
});
