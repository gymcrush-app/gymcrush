import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { Religion } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const RELIGION_OPTIONS: Religion[] = [
  'Atheist',
  'Jewish',
  'Muslim',
  'Christian',
  'Catholic',
  'Buddhist',
  'Hindu',
  'Sikh',
  'Spiritual',
  'Other',
];

export default function OnboardingReligion() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const canContinue = data.religion !== null;

  const handleNext = () => {
    if (canContinue) {
      (navigation as any).navigate('vices');
    }
  };

  return (
    <OnboardingContainer currentStep={2} totalSteps={17} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What's your faith?</Text>
          <Text style={styles.subtitle}>Select the one that best describes you</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.pillRow}>
            {RELIGION_OPTIONS.map((option) => {
              const isSelected = data.religion === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => updateData({ religion: option })}
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
