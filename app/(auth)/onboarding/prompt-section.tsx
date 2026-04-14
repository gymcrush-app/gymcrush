import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { FilteredTextarea } from '@/components/ui/FilteredTextarea';
import { usePromptSections } from '@/lib/api/prompts';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { track } from '@/lib/utils/analytics';
import { APP, borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { PromptAnswer } from '@/types/onboarding';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const TOTAL_STEPS = 14;
const TOTAL_PROMPT_SCREENS = 3;

export default function PromptSectionScreen() {
  const navigation = useNavigation();
  const { sectionIndex } = useLocalSearchParams<{ sectionIndex: string }>();
  const slotIdx = parseInt(sectionIndex ?? '0', 10);

  const { data: sections, isLoading } = usePromptSections();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  // Find existing answer for this slot (by slot index position)
  const existingAnswer = useMemo(() => {
    if (!sections) return null;
    return data.prompts[slotIdx] ?? null;
  }, [data.prompts, slotIdx, sections]);

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(
    existingAnswer?.sectionId ?? null
  );
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(
    existingAnswer?.promptId ?? null
  );
  const [answer, setAnswer] = useState(existingAnswer?.answer ?? '');
  const textareaRef = useRef<TextInput>(null);

  // Reset state when navigating to a different prompt slot
  const prevSlotIdx = useRef(slotIdx);
  if (prevSlotIdx.current !== slotIdx) {
    prevSlotIdx.current = slotIdx;
    const next = data.prompts[slotIdx] ?? null;
    setSelectedThemeId(next?.sectionId ?? null);
    setSelectedPromptId(next?.promptId ?? null);
    setAnswer(next?.answer ?? '');
  }

  // Collect promptIds already chosen in OTHER slots (not this one)
  const usedPromptIds = useMemo(() => {
    return new Set(
      data.prompts
        .filter((_, idx) => idx !== slotIdx)
        .map((p) => p.promptId)
    );
  }, [data.prompts, slotIdx]);

  // Filter questions for selected theme, excluding already-used prompts
  const availableQuestions = useMemo(() => {
    if (!selectedThemeId || !sections) return [];
    const section = sections.find((s) => s.id === selectedThemeId);
    if (!section) return [];
    return section.prompts.filter((p) => !usedPromptIds.has(p.id));
  }, [selectedThemeId, sections, usedPromptIds]);

  const handleSelectTheme = useCallback((themeId: string) => {
    setSelectedThemeId(themeId);
    // Clear question selection when switching themes (unless it belongs to this theme)
    if (selectedPromptId) {
      const stillAvailable = sections
        ?.find((s) => s.id === themeId)
        ?.prompts.some((p) => p.id === selectedPromptId && !usedPromptIds.has(p.id));
      if (!stillAvailable) {
        setSelectedPromptId(null);
        setAnswer('');
      }
    }
  }, [selectedPromptId, sections, usedPromptIds]);

  const handleSelectPrompt = useCallback((promptId: string) => {
    setSelectedPromptId(promptId);
    setAnswer('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const canContinue = !!selectedPromptId && !!selectedThemeId && answer.trim().length > 0;

  const handleNext = useCallback(() => {
    if (!canContinue || !selectedPromptId || !selectedThemeId) return;

    // Build updated prompts array, placing this answer at the correct slot index
    const newEntry: PromptAnswer = {
      promptId: selectedPromptId,
      sectionId: selectedThemeId,
      answer: answer.trim(),
    };
    const updatedPrompts = [...data.prompts];
    updatedPrompts[slotIdx] = newEntry;
    updateData({ prompts: updatedPrompts });

    track('onboarding_step_completed', { step: 'prompt-section', index: 9 + slotIdx });

    if (slotIdx < TOTAL_PROMPT_SCREENS - 1) {
      (navigation as any).navigate('prompt-section', { sectionIndex: String(slotIdx + 1) });
    } else {
      (navigation as any).navigate('photos');
    }
  }, [canContinue, selectedPromptId, selectedThemeId, answer, data.prompts, updateData, slotIdx, navigation]);

  const currentStep = 10 + slotIdx;

  if (isLoading || !sections) {
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Pick a theme & question</Text>
          <Text style={styles.subtitle}>
            Answer {slotIdx + 1} of {TOTAL_PROMPT_SCREENS} prompts
          </Text>
        </View>

        {/* Theme selector */}
        <View style={styles.themesWrap}>
          {sections.map((section) => {
            const isSelected = selectedThemeId === section.id;
            return (
              <Pressable
                key={section.id}
                onPress={() => handleSelectTheme(section.id)}
                style={[
                  styles.themeButton,
                  isSelected && styles.themeButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.themeButtonText,
                    isSelected && styles.themeButtonTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {section.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Questions list — show only selected prompt when one is chosen */}
        {selectedThemeId && (
          <View style={styles.questionsList}>
            {selectedPromptId ? (
              // Show only the selected prompt (tap to deselect and pick another)
              (() => {
                const prompt = availableQuestions.find((p) => p.id === selectedPromptId)
                  ?? sections.flatMap((s) => s.prompts).find((p) => p.id === selectedPromptId);
                if (!prompt) return null;
                return (
                  <Pressable
                    key={prompt.id}
                    onPress={() => {
                      setSelectedPromptId(null);
                      setAnswer('');
                    }}
                    style={[styles.questionOption, styles.questionOptionSelected]}
                  >
                    <Text style={[styles.questionOptionText, styles.questionOptionTextSelected]}>
                      {prompt.prompt_text}
                    </Text>
                  </Pressable>
                );
              })()
            ) : (
              availableQuestions.map((prompt) => (
                <Pressable
                  key={prompt.id}
                  onPress={() => handleSelectPrompt(prompt.id)}
                  style={[styles.questionOption]}
                >
                  <Text style={[styles.questionOptionText]}>
                    {prompt.prompt_text}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* Answer textarea */}
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
      </ScrollView>

      <FloatingActionButton onPress={handleNext} disabled={!canContinue}>
        {slotIdx < TOTAL_PROMPT_SCREENS - 1 ? 'Next' : 'Continue'}
      </FloatingActionButton>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    gap: spacing[6],
    paddingBottom: spacing[24],
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
  themesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  themeButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  themeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  themeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  themeButtonTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  questionsList: {
    gap: spacing[2],
  },
  questionOption: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  questionOptionText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  questionOptionTextSelected: {
    color: colors.primary,
  },
  textarea: {},
});
