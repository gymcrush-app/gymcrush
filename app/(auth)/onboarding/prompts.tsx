import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer, OnboardingScrollContext } from '@/components/onboarding/OnboardingContainer';
import { FilteredTextarea } from '@/components/ui/FilteredTextarea';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { APP, borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { PromptAnswer } from '@/types/onboarding';
import { FITNESS_PROMPTS } from '@/types/onboarding';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useNavigation } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const MAX_PROMPTS = 3;

export default function OnboardingPrompts() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);
  const [prompts, setPrompts] = useState<PromptAnswer[]>(() => {
    const fromData = data.prompts && data.prompts.length > 0 ? data.prompts : [];
    const result = [...fromData];
    while (result.length < MAX_PROMPTS) {
      result.push({ prompt: '', answer: '' });
    }
    return result.slice(0, MAX_PROMPTS);
  });
  
  // Bottom sheet for prompt selection
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const promptBottomSheetRef = useRef<BottomSheet>(null);
  const promptSnapPoints = useMemo(() => ['95%'], []);
  
  // Refs for textarea inputs to focus them when prompt is selected
  const textareaRefs = useRef<(TextInput | null)[]>([]);
  const scrollViewRef = React.useContext(OnboardingScrollContext);
  const headerHeightRef = useRef(0);
  const cardYRef = useRef<number[]>([]);
  const SCROLL_MARGIN = 80;

  // Get available prompts (exclude already selected ones)
  const getAvailablePrompts = (currentIndex: number) => {
    const usedPrompts = prompts
      .map((p) => p.prompt)
      .filter((p, i) => i !== currentIndex && p !== '');
    return FITNESS_PROMPTS.filter((p) => !usedPrompts.includes(p));
  };

  const handleOpenPromptSheet = (index: number) => {
    setSelectedPromptIndex(index);
    promptBottomSheetRef.current?.snapToIndex(0);
  };

  const handleClosePromptSheet = useCallback(() => {
    promptBottomSheetRef.current?.close();
    setSelectedPromptIndex(null);
  }, []);

  const handleSelectPrompt = (prompt: string) => {
    if (selectedPromptIndex !== null) {
      updatePrompt(selectedPromptIndex, 'prompt', prompt);
      handleClosePromptSheet();
      // Focus the corresponding textarea after sheet close animation and layout settle
      setTimeout(() => {
        textareaRefs.current[selectedPromptIndex]?.focus();
      }, 250);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const updatePrompt = (index: number, field: 'prompt' | 'answer', value: string) => {
    const newPrompts = [...prompts];
    if (!newPrompts[index]) {
      newPrompts[index] = { prompt: '', answer: '' };
    }
    newPrompts[index] = { ...newPrompts[index], [field]: value };
    setPrompts(newPrompts);
    updateData({ prompts: newPrompts });
  };

  const canContinue = prompts.length > 0 && prompts.every(
    (p) => p.prompt !== '' && p.answer.trim().length > 0
  );

  const handleNext = () => {
    if (canContinue) {
      (navigation as any).navigate('photos');
    }
  };

  const availablePrompts = selectedPromptIndex !== null 
    ? getAvailablePrompts(selectedPromptIndex)
    : [];

  const scrollToCard = useCallback((index: number) => {
    setTimeout(() => {
      const headerH = headerHeightRef.current;
      const cardY = cardYRef.current[index];
      if (cardY === undefined) return;
      const targetY = Math.max(0, headerH + cardY - SCROLL_MARGIN);
      scrollViewRef?.current?.scrollTo({ y: targetY, animated: true });
    }, 100);
  }, []);

  return (
    <OnboardingContainer currentStep={7} totalSteps={9} showBack={true}>
      <View style={styles.content}>
        <View
          style={styles.header}
          onLayout={(e: LayoutChangeEvent) => {
            headerHeightRef.current = e.nativeEvent.layout.height;
          }}
        >
          <Text style={styles.title}>
            Answer prompts
          </Text>
          <Text style={styles.subtitle}>
          Share your fitness personality ({MAX_PROMPTS} prompts)
          </Text>
        </View>

        <View style={styles.promptsContainer}>
          {prompts.map((prompt, index) => (
            <View
              key={index}
              style={styles.promptCard}
              onLayout={(e: LayoutChangeEvent) => {
                cardYRef.current[index] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.promptHeader}>
                <Text style={styles.promptNumber}>Prompt {index + 1}</Text>
              </View>

              <Pressable
                onPress={() => handleOpenPromptSheet(index)}
                style={[
                  styles.promptSelectButton,
                  !prompt.prompt && styles.promptSelectButtonEmpty,
                ]}
              >
                <Text
                  style={[
                    styles.promptSelectText,
                    !prompt.prompt && styles.promptSelectTextPlaceholder,
                  ]}
                  numberOfLines={2}
                >
                  {prompt.prompt || 'Choose a prompt'}
                </Text>
                <ChevronDown size={20} color={colors.mutedForeground} />
              </Pressable>

              {prompt.prompt && (
                <FilteredTextarea
                  ref={(ref) => {
                    if (ref) {
                      textareaRefs.current[index] = ref;
                    }
                  }}
                  placeholder="Your answer..."
                  value={prompt.answer}
                  onChangeText={(text: string) => updatePrompt(index, 'answer', text)}
                  maxLength={APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH}
                  showCharCount
                  style={styles.textarea}
                  onFocus={() => scrollToCard(index)}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      <FloatingActionButton onPress={handleNext} disabled={!canContinue}>
        Continue
      </FloatingActionButton>

      {/* Prompt Selection Bottom Sheet */}
      <BottomSheet
        ref={promptBottomSheetRef}
        index={-1}
        snapPoints={promptSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="none"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Choose a prompt</Text>
            <View style={styles.promptsList}>
              {availablePrompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  onPress={() => handleSelectPrompt(prompt)}
                  style={styles.promptOption}
                >
                  <Text style={styles.promptOptionText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[8],
    paddingBottom: spacing[16],
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
  promptsContainer: {
    gap: spacing[6],
  },
  promptCard: {
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  textarea: {
    // minHeight: 96,
  },
  promptSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  promptSelectButtonEmpty: {
    borderColor: colors.border,
  },
  promptSelectText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.foreground,
    marginRight: spacing[2],
  },
  promptSelectTextPlaceholder: {
    color: colors.mutedForeground,
  },
  bottomSheetBackground: {
    backgroundColor: colors.card,
  },
  bottomSheetIndicator: {
    backgroundColor: colors.muted,
  },
  bottomSheetContent: {
    padding: spacing[6],
    marginBottom: spacing[28],
    gap: spacing[4],
  },
  bottomSheetTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
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
  promptOptionText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
});
