import { borderRadius, colors, fontSize, fontWeight, gradients, spacing } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ActionButtonsProps {
  onSkip: () => void;
  onInterested: () => void;
}

export function ActionButtons({ onSkip, onInterested }: ActionButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Skip Button - Dark background with down arrow */}
      <Pressable
        onPress={onSkip}
        style={({ pressed }) => [
          styles.button,
          styles.skipButton,
          pressed && { opacity: 0.8 },
        ]}
      >
        <ChevronDown size={20} color={colors.foreground} />
        <Text style={[styles.buttonText, styles.skipButtonText]}>Skip</Text>
      </Pressable>

      {/* Interested Button - Light pink/orange gradient with up arrow */}
      <Pressable
        onPress={onInterested}
        style={({ pressed }) => [
          styles.button,
          styles.interestedButton,
          pressed && { opacity: 0.8 },
        ]}
      >
        <LinearGradient
          colors={gradients.primary.colors}
          start={gradients.primary.start}
          end={gradients.primary.end}
          style={styles.gradient}
        />
        <ChevronUp size={20} color={colors.primaryForeground} />
        <Text style={[styles.buttonText, styles.interestedButtonText]}>Interested</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    flexDirection: 'row',
    // justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    // paddingHorizontal: spacing[4],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    // paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    flex:1
  },
  skipButton: {
    backgroundColor: colors.card,
  },
  interestedButton: {
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  skipButtonText: {
    color: colors.foreground,
  },
  interestedButtonText: {
    color: colors.primaryForeground,
  },
});
