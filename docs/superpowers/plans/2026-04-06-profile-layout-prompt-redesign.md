# Profile Layout Reorder + Prompt Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder profile views to interleave 3 prompts with 2 info boxes, and redesign prompt onboarding from 7 forced-section screens to 3 free-choice screens.

**Architecture:** Replace batch prompt splitting with individual prompt1/prompt2/prompt3 rendering. Replace `ProfileDetailContent` wrapper with inline component rendering. Rewrite `prompt-section.tsx` to show all themes with free question selection and cross-screen filtering. Update step counts from 17 to 13.

**Tech Stack:** React Native / Expo Router, Supabase, Zustand, React Query, TypeScript

---

### Task 1: Rewrite Prompt Onboarding Screen

**Files:**
- Modify: `app/(auth)/onboarding/prompt-section.tsx`

The current screen is locked to a specific section (theme). The new version lets the user browse all 7 themes, pick a question from any theme, and write an answer. Previously chosen questions are filtered out across screens.

- [ ] **Step 1: Rewrite prompt-section.tsx**

Replace the entire contents of `app/(auth)/onboarding/prompt-section.tsx` with:

```tsx
import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { FilteredTextarea } from '@/components/ui/FilteredTextarea';
import { usePromptSections } from '@/lib/api/prompts';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { APP, borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { PromptAnswer } from '@/types/onboarding';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const TOTAL_STEPS = 13;
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
    // Prompts are stored in order; the Nth entry corresponds to slot N
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

        {/* Questions list */}
        {selectedThemeId && (
          <View style={styles.questionsList}>
            {availableQuestions.map((prompt) => {
              const isSelected = selectedPromptId === prompt.id;
              return (
                <Pressable
                  key={prompt.id}
                  onPress={() => handleSelectPrompt(prompt.id)}
                  style={[
                    styles.questionOption,
                    isSelected && styles.questionOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.questionOptionText,
                      isSelected && styles.questionOptionTextSelected,
                    ]}
                  >
                    {prompt.prompt_text}
                  </Text>
                </Pressable>
              );
            })}
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
```

- [ ] **Step 2: Verify the screen loads**

Run the app, navigate through onboarding to the first prompt screen.
Expected: Shows all 7 themes as pills. Tapping a theme shows its questions. Selecting a question shows the textarea. Continue navigates to slot 1, then 2, then photos.

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/onboarding/prompt-section.tsx
git commit -m "feat: redesign prompt onboarding to 3 free-choice screens with theme browsing"
```

---

### Task 2: Update Step Numbers (17 → 13)

**Files:**
- Modify: `app/(auth)/onboarding/basic-info.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/religion.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/vices.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/kids.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/intent.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/select-home-gym.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/fitness.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/frequency.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/gym-preferences.tsx` — totalSteps 17 → 13
- Modify: `app/(auth)/onboarding/photos.tsx` — currentStep 17 → 13, totalSteps 17 → 13

New step mapping:

| Step | Screen | currentStep |
|------|--------|-------------|
| 1 | basic-info | 1 |
| 2 | religion | 2 |
| 3 | vices | 3 |
| 4 | kids | 4 |
| 5 | intent | 5 |
| 6 | select-home-gym | 6 |
| 7 | fitness | 7 |
| 8 | frequency | 8 |
| 9 | gym-preferences | 9 |
| 10-12 | prompt-section (0-2) | 10 + slotIdx |
| 13 | photos | 13 |

- [ ] **Step 1: Update all onboarding screens**

In each file, find `totalSteps={17}` and change to `totalSteps={13}`. For photos, also change `currentStep={17}` to `currentStep={13}`.

All `currentStep` values remain the same (1-9 are unchanged, prompt-section uses `10 + slotIdx`, photos changes from 17 to 13).

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/onboarding/basic-info.tsx app/(auth)/onboarding/religion.tsx app/(auth)/onboarding/vices.tsx app/(auth)/onboarding/kids.tsx app/(auth)/onboarding/intent.tsx app/(auth)/onboarding/select-home-gym.tsx app/(auth)/onboarding/fitness.tsx app/(auth)/onboarding/frequency.tsx app/(auth)/onboarding/gym-preferences.tsx app/(auth)/onboarding/photos.tsx
git commit -m "fix: update onboarding step numbers from 17 to 13"
```

---

### Task 3: Reorder OtherUserProfileContent Layout

**Files:**
- Modify: `components/profile/OtherUserProfileContent.tsx`

Replace batch splitting with individual prompt rendering and reorder the layout.

- [ ] **Step 1: Replace prompt splitting logic**

In `components/profile/OtherUserProfileContent.tsx`, find the `useMemo` that creates `topPrompt`, `promptBatch1`, `promptBatch2` (lines ~75-86) and replace with:

```tsx
const { prompt1, prompt2, prompt3 } = useMemo(() => {
  if (prompts.length === 0) return { prompt1: null, prompt2: null, prompt3: null }
  const sorted = [...prompts].sort((a, b) => b.engagement_count - a.engagement_count)
  return {
    prompt1: sorted[0] ?? null,
    prompt2: sorted[1] ?? null,
    prompt3: sorted[2] ?? null,
  }
}, [prompts])
```

- [ ] **Step 2: Replace the JSX layout**

Remove the `ProfileDetailContent` import and add individual imports:

```tsx
import { AboutSection } from "@/components/profile/AboutSection"
import { ProfileInfoBox } from "@/components/profile/ProfileInfoBox"
import { ProfileLifestyleBox } from "@/components/profile/ProfileLifestyleBox"
import { PromptItem } from "@/components/profile/PromptItem"
```

Remove the `ProfileDetailContent` import line. Remove the `PromptsList` import if no longer used.

Replace the layout section (from `{/* 1. Most-engaged prompt */}` through `{/* 5. Second batch */}`) with:

```tsx
          {/* 1. Top prompt (most engaged) */}
          {prompt1 && (
            <View style={styles.promptSection}>
              <PromptItem
                title={prompt1.title}
                answer={prompt1.answer}
                onPress={() => handlePromptPress(prompt1.title, prompt1.answer)}
                highlighted
              />
            </View>
          )}

          {/* 2. Info box */}
          <ProfileInfoBox
            height={profile.height ?? null}
            intent={formattedIntents}
            occupation={profile.occupation ?? null}
            city={profileGym?.city ?? null}
          />

          {/* 3. Bio */}
          <AboutSection bio={profile.bio || null} />

          {/* 4. Prompt 2 */}
          {prompt2 && (
            <PromptItem
              title={prompt2.title}
              answer={prompt2.answer}
              onPress={() => handlePromptPress(prompt2.title, prompt2.answer)}
              highlighted
            />
          )}

          {/* 5. Lifestyle info box */}
          <ProfileLifestyleBox
            religion={(profile as any).religion ?? null}
            alcohol={(profile as any).alcohol ?? null}
            smoking={(profile as any).smoking ?? null}
            marijuana={(profile as any).marijuana ?? null}
            hasKids={(profile as any).has_kids ?? null}
          />

          {/* 6. Prompt 3 */}
          {prompt3 && (
            <PromptItem
              title={prompt3.title}
              answer={prompt3.answer}
              onPress={() => handlePromptPress(prompt3.title, prompt3.answer)}
              highlighted
            />
          )}

          {/* Fitness badges */}
          {disciplines.length > 0 && (
            <View style={styles.badgesSection}>
              <FitnessBadges disciplines={disciplines} />
            </View>
          )}
```

- [ ] **Step 3: Commit**

```bash
git add components/profile/OtherUserProfileContent.tsx
git commit -m "feat: reorder OtherUserProfileContent with interleaved prompts and info boxes"
```

---

### Task 4: Reorder SwipeDeck Profile Layout

**Files:**
- Modify: `components/discover/SwipeDeck/index.tsx`

Same layout reorder as OtherUserProfileContent.

- [ ] **Step 1: Replace prompt splitting logic**

Find the `useMemo` that creates `topPrompt`, `promptBatch1`, `promptBatch2` (lines ~148-162) and replace with:

```tsx
// Split prompts: most-engaged first, then 2nd and 3rd
const { prompt1, prompt2, prompt3 } = useMemo(() => {
  if (prompts.length === 0) return { prompt1: null, prompt2: null, prompt3: null }
  const sorted = [...prompts].sort((a, b) => b.engagement_count - a.engagement_count)
  return {
    prompt1: sorted[0] ?? null,
    prompt2: sorted[1] ?? null,
    prompt3: sorted[2] ?? null,
  }
}, [prompts])
```

- [ ] **Step 2: Replace the JSX layout**

Add imports for `AboutSection`, `ProfileLifestyleBox`, and `PromptItem` (if not already imported). Remove `PromptsList` import if no longer needed.

```tsx
import { AboutSection } from "@/components/profile/AboutSection"
import { ProfileLifestyleBox } from "@/components/profile/ProfileLifestyleBox"
```

Replace the profile content section (from `{/* 1. Most-engaged prompt */}` through `{/* 5. Second batch */}`, approximately lines 727-767) with:

```tsx
              {/* 1. Top prompt (most engaged) */}
              {prompt1 && (
                <PromptItem
                  title={prompt1.title}
                  answer={prompt1.answer}
                  onPress={() => handlePromptPress(prompt1.title, prompt1.answer)}
                  highlighted
                />
              )}

              {/* 2. Info box */}
              <ProfileInfoBox
                height={height}
                intent={formattedIntents}
                occupation={topProfile.occupation ?? null}
                city={profileGym?.city ?? null}
              />

              {/* 3. Bio */}
              <AboutSection bio={topProfile.bio ?? null} />

              {/* 4. Prompt 2 */}
              {prompt2 && (
                <PromptItem
                  title={prompt2.title}
                  answer={prompt2.answer}
                  onPress={() => handlePromptPress(prompt2.title, prompt2.answer)}
                  highlighted
                />
              )}

              {/* 5. Lifestyle info box */}
              <ProfileLifestyleBox
                religion={(topProfile as any).religion ?? null}
                alcohol={(topProfile as any).alcohol ?? null}
                smoking={(topProfile as any).smoking ?? null}
                marijuana={(topProfile as any).marijuana ?? null}
                hasKids={(topProfile as any).has_kids ?? null}
              />

              {/* 6. Prompt 3 */}
              {prompt3 && (
                <PromptItem
                  title={prompt3.title}
                  answer={prompt3.answer}
                  onPress={() => handlePromptPress(prompt3.title, prompt3.answer)}
                  highlighted
                />
              )}
```

Note: The `ProfileDetailContent` import can be removed from this file since it's no longer used here. The `ProfileInfoBox` import should already exist.

- [ ] **Step 3: Commit**

```bash
git add components/discover/SwipeDeck/index.tsx
git commit -m "feat: reorder SwipeDeck profile layout with interleaved prompts and info boxes"
```

---

### Task 5: Reorder ProfileDetailSheet Layout

**Files:**
- Modify: `components/discover/SwipeDeck/ProfileDetailSheet.tsx`

Same layout reorder for the bottom sheet detail view.

- [ ] **Step 1: Rewrite ProfileDetailSheet**

Replace the content of `ProfileDetailSheet.tsx`. The `prompts` prop changes from an array to 3 individual prompts. Update the interface and rendering:

```tsx
import { AboutSection } from '@/components/profile/AboutSection';
import { ProfileInfoBox } from '@/components/profile/ProfileInfoBox';
import { ProfileLifestyleBox } from '@/components/profile/ProfileLifestyleBox';
import { PromptItem } from '@/components/profile/PromptItem';
import { formatDistanceKmRounded } from '@/lib/utils/distance';
import { formatIntents } from '@/lib/utils/formatting';
import { colors, spacing } from '@/theme';
import { Profile } from '@/types';
import { Intent } from '@/types/onboarding';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { RefObject, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

interface ProfileDetailSheetProps {
  profile: Profile | null;
  profileGym: { city?: string; [key: string]: any } | null | undefined;
  distance: number | null;
  prompts: Array<{ id: string; title: string; answer: string }>;
  onPromptPress: (title: string, answer: string) => void;
  bottomSheetRef: RefObject<BottomSheetModal | null>;
}

const renderBackdrop = (props: any) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.5}
  />
);

export function ProfileDetailSheet({
  profile,
  profileGym,
  distance,
  prompts,
  onPromptPress,
  bottomSheetRef,
}: ProfileDetailSheetProps) {
  const snapPoints = useMemo(() => ['75%', '95%'], []);

  if (!profile) return null;

  const discoveryPrefs = profile.discovery_preferences as any;
  const intents = (discoveryPrefs?.intents || []) as Intent[];
  const height = profile.height ?? discoveryPrefs?.height ?? null;
  const formattedIntents = formatIntents(intents);

  const age = profile.age ?? null;

  const prompt1 = prompts[0] ?? null;
  const prompt2 = prompts[1] ?? null;
  const prompt3 = prompts[2] ?? null;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
      enablePanDownToClose
    >
      <BottomSheetScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text variant="h2">
            {profile.display_name}{age != null ? `, ${age}` : ''}
          </Text>

          {/* 1. Top prompt */}
          {prompt1 && (
            <PromptItem
              title={prompt1.title}
              answer={prompt1.answer}
              onPress={() => onPromptPress(prompt1.title, prompt1.answer)}
              highlighted
            />
          )}

          {/* 2. Info box */}
          <ProfileInfoBox
            height={height}
            intent={formattedIntents}
            occupation={profile.occupation ?? null}
            city={profileGym?.city ?? null}
          />

          {/* 3. Bio */}
          <AboutSection bio={profile.bio ?? null} />

          {/* 4. Prompt 2 */}
          {prompt2 && (
            <PromptItem
              title={prompt2.title}
              answer={prompt2.answer}
              onPress={() => onPromptPress(prompt2.title, prompt2.answer)}
              highlighted
            />
          )}

          {/* 5. Lifestyle info box */}
          <ProfileLifestyleBox
            religion={(profile as any).religion ?? null}
            alcohol={(profile as any).alcohol ?? null}
            smoking={(profile as any).smoking ?? null}
            marijuana={(profile as any).marijuana ?? null}
            hasKids={(profile as any).has_kids ?? null}
          />

          {/* 6. Prompt 3 */}
          {prompt3 && (
            <PromptItem
              title={prompt3.title}
              answer={prompt3.answer}
              onPress={() => onPromptPress(prompt3.title, prompt3.answer)}
              highlighted
            />
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.card,
  },
  indicator: {
    backgroundColor: colors.muted,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/discover/SwipeDeck/ProfileDetailSheet.tsx
git commit -m "feat: reorder ProfileDetailSheet with interleaved prompts and info boxes"
```

---

### Task 6: Clean Up ProfileDetailContent

**Files:**
- Modify: `components/profile/ProfileDetailContent.tsx`
- Modify: `components/profile/ProfileView.tsx`

`ProfileDetailContent` was a wrapper that bundled InfoBox + LifestyleBox + Bio. After Tasks 3-5, it's only used by `ProfileView` (self profile). Simplify or check if it's still referenced anywhere.

- [ ] **Step 1: Check remaining usages of ProfileDetailContent**

Search for `ProfileDetailContent` across the codebase. After Tasks 3-5, it should only be used in `ProfileView.tsx` (if at all). 

- [ ] **Step 2: Update ProfileView to render components inline**

In `components/profile/ProfileView.tsx`, replace the `ProfileDetailContent` usage with inline components in the new order. The self-profile view should show:

```tsx
<ProfileInfoBox
  height={profile.height ?? null}
  intent={formattedIntents}
  occupation={profile.occupation ?? null}
  city={gym?.city ?? null}
/>

<AboutSection bio={profile.bio ?? null} />

<ProfileLifestyleBox
  religion={(profile as any).religion ?? null}
  alcohol={(profile as any).alcohol ?? null}
  smoking={(profile as any).smoking ?? null}
  marijuana={(profile as any).marijuana ?? null}
  hasKids={(profile as any).has_kids ?? null}
/>
```

Remove the `ProfileDetailContent` import. Keep `ProfileInfoBox` and add `AboutSection` import if not present. `ProfileLifestyleBox` should already be imported.

- [ ] **Step 3: Delete or simplify ProfileDetailContent**

If `ProfileDetailContent` has no remaining usages after step 2, delete `components/profile/ProfileDetailContent.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/profile/ProfileView.tsx components/profile/ProfileDetailContent.tsx
git commit -m "refactor: inline profile components in ProfileView, remove ProfileDetailContent"
```
