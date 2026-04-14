import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { track } from '@/lib/utils/analytics';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { YesNoSometimes } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const OPTIONS: YesNoSometimes[] = ['Yes', 'No', 'Sometimes'];

interface ViceSectionProps {
  label: string;
  value: YesNoSometimes | null;
  onSelect: (value: YesNoSometimes) => void;
}

function ViceSection({ label, value, onSelect }: ViceSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {OPTIONS.map((option) => {
          const isSelected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={[styles.pill, isSelected && styles.pillSelected]}
            >
              <Text
                style={[styles.pillText, isSelected && styles.pillTextSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function OnboardingVices() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const canContinue =
    data.alcohol !== null && data.smoking !== null && data.marijuana !== null;

  const handleNext = () => {
    if (canContinue) {
      track('onboarding_step_completed', { step: 'vices', index: 2 });
      (navigation as any).navigate('kids');
    }
  };

  return (
    <OnboardingContainer currentStep={4} totalSteps={14} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your lifestyle</Text>
          <Text style={styles.subtitle}>Help others know what to expect</Text>
        </View>

        <View style={styles.content}>
          <ViceSection
            label="Alcohol"
            value={data.alcohol}
            onSelect={(val) => updateData({ alcohol: val })}
          />
          <ViceSection
            label="Cigarettes"
            value={data.smoking}
            onSelect={(val) => updateData({ smoking: val })}
          />
          <ViceSection
            label="Marijuana"
            value={data.marijuana}
            onSelect={(val) => updateData({ marijuana: val })}
          />
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
    gap: spacing[8],
  },
  section: {
    gap: spacing[3],
  },
  sectionLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  pill: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
