import { Text } from '@/components/ui/Text';
import { PHOTO_INSET } from '@/components/profile/PhotoSection';
import { borderRadius, colors, fontSize, spacing } from '@/theme';
import { X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ApproachableInfoBoxProps {
  visible: boolean;
  approachPrompt: string;
  displayName: string;
  onDismiss: () => void;
}

export function ApproachableInfoBox({
  visible,
  approachPrompt,
  displayName,
  onDismiss,
}: ApproachableInfoBoxProps) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop — tapping anywhere outside dismisses */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

      {/* Info card */}
      <Animated.View entering={FadeIn.duration(200)} style={styles.card}>
        {/* Close button */}
        <Pressable style={styles.closeButton} onPress={onDismiss} hitSlop={8}>
          <X size={16} color={colors.mutedForeground} />
        </Pressable>

        {/* Header */}
        <Text variant="mutedXSmall" style={styles.header}>
          {displayName}&apos;s approach style
        </Text>

        {/* Body */}
        <Text variant="bodySmall" style={styles.body}>
          {approachPrompt}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: spacing[4] + 40,
    left: PHOTO_INSET + spacing[4],
    right: PHOTO_INSET + spacing[4],
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    padding: spacing[1],
    zIndex: 1,
  },
  header: {
    fontSize: fontSize.xs,
    marginBottom: spacing[1],
  },
  body: {
    color: colors.foreground,
    lineHeight: fontSize.sm * 1.4,
    paddingRight: spacing[4],
  },
});
