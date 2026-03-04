/**
 * Step indicator for onboarding (1–6 steps). Dots for completed/active/upcoming.
 */

import { colors, spacing, borderRadius } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
}

export function OnboardingProgress({ currentStep, totalSteps = 6 }: OnboardingProgressProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        
        return (
          <View
            key={step}
            style={[
              styles.stepIndicator,
              (isActive || isCompleted) ? styles.stepIndicatorActive : styles.stepIndicatorInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    width: spacing[3],
    height: spacing[3],
    borderRadius: borderRadius.full,
  },
  stepIndicatorActive: {
    backgroundColor: colors.primary,
  },
  stepIndicatorInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
