import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { track } from '@/lib/utils/analytics';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { Ethnicity } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ETHNICITY_OPTIONS: Ethnicity[] = [
  'Black / African Descent',
  'White / Caucasian',
  'Hispanic / Latino',
  'Asian',
  'South Asian',
  'Middle Eastern',
  'Native American',
  'Pacific Islander',
  'Other',
  'Prefer not to say',
];

export default function OnboardingEthnicity() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const canContinue = data.ethnicity.length > 0;

  const toggle = (option: Ethnicity) => {
    const current = data.ethnicity;
    const next = current.includes(option)
      ? current.filter((e) => e !== option)
      : [...current, option];
    updateData({ ethnicity: next });
  };

  const handleNext = () => {
    if (canContinue) {
      track('onboarding_step_completed', { step: 'ethnicity', index: 2 });
      (navigation as any).navigate('vices');
    }
  };

  return (
    <OnboardingContainer currentStep={3} totalSteps={14} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{"What's your ethnicity?"}</Text>
          <Text style={styles.subtitle}>Select all that apply</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.pillRow}>
            {ETHNICITY_OPTIONS.map((option) => {
              const isSelected = data.ethnicity.includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => toggle(option)}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FloatingActionButton onPress={handleNext} disabled={!canContinue}>
          Continue
        </FloatingActionButton>
      </View>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: spacing[2],
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[32],
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'center',
  },
  pill: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  pillText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  pillTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
