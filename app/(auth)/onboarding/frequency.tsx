import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { FitnessLifestyle, TrainingFrequency } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FREQUENCY_OPTIONS, LIFESTYLE_OPTIONS } from '@/constants';

export default function OnboardingFrequency() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const canContinue = data.trainingFrequency !== null && data.fitnessLifestyle !== null;

  const handleNext = () => {
    if (canContinue) {
      (navigation as any).navigate('gym-preferences');
    }
  };

  return (
    <OnboardingContainer currentStep={4} totalSteps={6} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Your training routine
          </Text>
          <Text style={styles.subtitle}>
            Help us understand your fitness lifestyle
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.sections}>
            {/* Training Frequency */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                How often do you train?
              </Text>
              <View style={styles.frequencyRow}>
                {FREQUENCY_OPTIONS.map((freq) => {
                  const isSelected = data.trainingFrequency === freq.value;
                  return (
                    <Pressable
                      key={freq.value}
                      onPress={() => updateData({ trainingFrequency: freq.value })}
                      style={[
                        styles.frequencyCard,
                        isSelected && styles.frequencyCardSelected,
                        {
                          shadowColor: isSelected ? colors.primary : colors.background,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 2,
                        },
                      ]}
                    >
                      <Text style={styles.frequencyLabel}>
                        {freq.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Fitness Lifestyle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                What describes you best?
              </Text>
              <View style={styles.lifestyleList}>
                {LIFESTYLE_OPTIONS.map((lifestyle) => {
                  const isSelected = data.fitnessLifestyle === lifestyle.value;
                  return (
                    <Pressable
                      key={lifestyle.value}
                      onPress={() => updateData({ fitnessLifestyle: lifestyle.value })}
                      style={[
                        styles.lifestyleCard,
                        isSelected && styles.lifestyleCardSelected,
                        {
                          shadowColor: isSelected ? colors.primary : colors.background,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 2,
                          marginBottom: spacing[3],
                        },
                      ]}
                    >
                      <Text style={styles.lifestyleLabel}>
                        {lifestyle.label}
                      </Text>
                      <Text style={styles.lifestyleDescription}>
                        {lifestyle.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
    marginBottom: spacing[8],
    gap: spacing[2],
    alignItems: 'center',
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
  sections: {
    gap: spacing[8],
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.lg,
    color: colors.foreground,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  frequencyCard: {
    flex: 1,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  frequencyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
  },
  frequencyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    color: colors.foreground,
  },
  lifestyleList: {
    gap: spacing[1],
  },
  lifestyleCard: {
    width: '100%',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  lifestyleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
  },
  lifestyleLabel: {
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  lifestyleDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
});
