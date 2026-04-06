import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { FilteredTextarea } from '@/components/ui/FilteredTextarea';
import { usePromptSections } from '@/lib/api/prompts';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { APP, borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { PromptAnswer } from '@/types/onboarding';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const TOTAL_STEPS = 17;

export default function PromptSectionScreen() {
  const navigation = useNavigation();
  const { sectionIndex } = useLocalSearchParams<{ sectionIndex: string }>();
  const sectionIdx = parseInt(sectionIndex ?? '0', 10);

  const { data: sections, isLoading } = usePromptSections();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const section = sections?.[sectionIdx];

  // Find existing answer for this section from onboarding store
  const existingAnswer = useMemo(() => {
    if (!section) return null;
    return data.prompts.find((p) => p.sectionId === section.id) ?? null;
  }, [data.prompts, section]);

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(
    existingAnswer?.promptId ?? null
  );
  const [answer, setAnswer] = useState(existingAnswer?.answer ?? '');
  const textareaRef = useRef<TextInput>(null);

  const handleSelectPrompt = useCallback((promptId: string) => {
    setSelectedPromptId(promptId);
    setAnswer('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const canContinue = !!selectedPromptId && answer.trim().length > 0;

  const handleNext = useCallback(() => {
    if (!canContinue || !section || !selectedPromptId) return;

    // Update the prompts array in onboarding store
    const updatedPrompts: PromptAnswer[] = [
      ...data.prompts.filter((p) => p.sectionId !== section.id),
      { promptId: selectedPromptId, sectionId: section.id, answer: answer.trim() },
    ];
    updateData({ prompts: updatedPrompts });

    // Navigate to next section or photos
    if (sectionIdx < 6) {
      (navigation as any).navigate('prompt-section', { sectionIndex: String(sectionIdx + 1) });
    } else {
      (navigation as any).navigate('photos');
    }
  }, [canContinue, section, selectedPromptId, answer, data.prompts, updateData, sectionIdx, navigation]);

  // Step number: sections 0-6 map to steps 7-13
  const currentStep = 10 + sectionIdx;

  if (isLoading || !section) {
    return (
      <OnboardingContainer currentStep={currentStep} totalSteps={TOTAL_STEPS} showBack={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </OnboardingContainer>
    );
  }

  return (
    <OnboardingContainer currentStep={currentStep} totalSteps={TOTAL_STEPS} showBack={true}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{section.name}</Text>
          <Text style={styles.subtitle}>{section.subtitle}</Text>
        </View>

        <View style={styles.promptsList}>
          {section.prompts.map((prompt) => {
            const isSelected = selectedPromptId === prompt.id;
            return (
              <Pressable
                key={prompt.id}
                onPress={() => handleSelectPrompt(prompt.id)}
                style={[
                  styles.promptOption,
                  isSelected && styles.promptOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.promptOptionText,
                    isSelected && styles.promptOptionTextSelected,
                  ]}
                >
                  {prompt.prompt_text}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedPromptId && (
          <FilteredTextarea
            ref={textareaRef}
            placeholder="Your answer..."
            value={answer}
            onChangeText={setAnswer}
            maxLength={APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH}
            showCharCount
            style={styles.textarea}
          />
        )}
      </View>

      <FloatingActionButton onPress={handleNext} disabled={!canContinue}>
        {sectionIdx < 6 ? 'Next' : 'Continue'}
      </FloatingActionButton>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[6],
    paddingBottom: spacing[16],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  header: {
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
  promptsList: {
    gap: spacing[2],
  },
  promptOption: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  promptOptionText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  promptOptionTextSelected: {
    color: colors.primary,
  },
  textarea: {},
});
