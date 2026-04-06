import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { YesNo } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const OPTIONS: YesNo[] = ['Yes', 'No'];

export default function OnboardingKids() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const canContinue = data.hasKids !== null;

  const handleNext = () => {
    if (canContinue) {
      (navigation as any).navigate('intent');
    }
  };

  return (
    <OnboardingContainer currentStep={4} totalSteps={17} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Do you have kids?</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.buttonRow}>
            {OPTIONS.map((option) => {
              const isSelected = data.hasKids === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => updateData({ hasKids: option })}
                  style={[styles.button, isSelected && styles.buttonSelected]}
                >
                  <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[32],
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  button: {
    maxWidth: 160,
    width: 160,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  buttonTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
