import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { track } from '@/lib/utils/analytics';
import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { APPROACH_OPTIONS } from '@/constants';

export default function OnboardingGymPreferences() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const canContinue = data.approachPreference !== null;

  const handleNext = () => {
    if (canContinue) {
      track('onboarding_step_completed', { step: 'gym-preferences', index: 8 });
      (navigation as any).navigate('prompt-section', { sectionIndex: '0' });
    }
  };

  return (
    <OnboardingContainer currentStep={8} totalSteps={12} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Gym preferences
          </Text>
          <Text style={styles.subtitle}>
            Set your comfort level
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.sections}>
            {/* Approach Preference */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Open to being approached at the gym?
              </Text>
              <View style={styles.optionsList}>
                {APPROACH_OPTIONS.map((option) => {
                  const isSelected = data.approachPreference === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => updateData({ approachPreference: option.value })}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
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
                      <Text style={styles.optionLabel}>
                        {option.label}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {option.description}
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
    fontFamily: fontFamily.manropeBold,
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
    // gap: spacing[8],
  },
  section: {
    gap: spacing[4],
  },
  sectionTitle: {
    fontFamily: fontFamily.manropeSemibold,
    fontSize: fontSize.lg,
    color: colors.foreground,
  },
  optionsList: {
    gap: spacing[1],
  },
  optionCard: {
    width: '100%',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
  },
  optionLabel: {
    fontFamily: fontFamily.manropeMedium,
    color: colors.foreground,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
});
