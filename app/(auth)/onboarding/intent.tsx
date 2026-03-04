import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { Intent } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { INTENT_OPTIONS } from '@/constants';

export default function OnboardingIntent() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const toggleIntent = (intent: Intent) => {
    const current = data.intents;
    const updated = current.includes(intent)
      ? current.filter((i) => i !== intent)
      : [...current, intent];
    updateData({ intents: updated });
  };

  const canContinue = data.intents.length > 0;

  const handleNext = () => {
    if (canContinue) {
      // Navigate to next step (discipline/fitness)
      (navigation as any).navigate('fitness');
    }
  };

  return (
    <OnboardingContainer currentStep={2} totalSteps={6} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            What brings you here?
          </Text>
          <Text style={styles.subtitle}>
            Select all that apply — you can change this anytime
          </Text>
        </View>

        <View style={styles.content}>
          {INTENT_OPTIONS.map((intent) => {
            const isSelected = data.intents.includes(intent.value);
            return (
              <Pressable
                key={intent.value}
                onPress={() => toggleIntent(intent.value)}
                style={[
                  styles.intentCard,
                  isSelected && styles.intentCardSelected,
                  {
                    shadowColor: isSelected ? colors.primary : colors.background,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isSelected ? 0.3 : 0.2,
                    shadowRadius: 8,
                    elevation: isSelected ? 4 : 2,
                    marginBottom: spacing[4],
                  },
                ]}
              >
                <View style={styles.intentContent}>
                  <Text style={styles.emoji}>{intent.emoji}</Text>
                  <View style={styles.intentText}>
                    <Text style={styles.intentLabel}>
                      {intent.label}
                    </Text>
                    <Text style={styles.intentDescription}>
                      {intent.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Text style={styles.checkmark}>
                        ✓
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
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
  intentCard: {
    width: '100%',
    padding: spacing[5],
    borderRadius: borderRadius['2xl'],
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  intentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
  },
  intentContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
  },
  emoji: {
    fontSize: fontSize['3xl'],
  },
  intentText: {
    flex: 1,
  },
  intentLabel: {
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  intentDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[0.5],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.mutedForeground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.primaryForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
