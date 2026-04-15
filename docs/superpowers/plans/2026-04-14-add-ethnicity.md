# Add Ethnicity to Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-select ethnicity field to the profile — database, onboarding, display, and edit.

**Architecture:** New `ethnicity TEXT[]` column (same pattern as `fitness_disciplines`). New onboarding screen between religion and vices. Display in ProfileLifestyleBox. Multi-select pill UI in edit profile.

**Tech Stack:** Supabase (Postgres), React Native, Expo Router, Zustand

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/00037_add_ethnicity.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add ethnicity (multi-select) to profiles
ALTER TABLE profiles
  ADD COLUMN ethnicity TEXT[] DEFAULT '{}';

-- Constrain each array element to allowed values
ALTER TABLE profiles
  ADD CONSTRAINT ethnicity_values_check
  CHECK (ethnicity <@ ARRAY[
    'Black / African Descent',
    'White / Caucasian',
    'Hispanic / Latino',
    'Asian',
    'South Asian',
    'Middle Eastern',
    'Native American',
    'Pacific Islander',
    'Other',
    'Prefer not to say'
  ]::TEXT[]);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/00037_add_ethnicity.sql
git commit -m "feat: add ethnicity TEXT[] column to profiles"
```

---

### Task 2: Type Definitions

**Files:**
- Modify: `types/database.ts` (Row, Insert, Update for profiles)
- Modify: `types/onboarding.ts`

- [ ] **Step 1: Add `ethnicity` to database types**

In `types/database.ts`, add to the profiles table types:

**Row** (after `discovery_preferences` line ~422):
```typescript
          ethnicity: string[]
```

**Insert** (after `discovery_preferences` line ~448):
```typescript
          ethnicity?: string[]
```

**Update** (after `discovery_preferences` line ~474):
```typescript
          ethnicity?: string[]
```

- [ ] **Step 2: Add Ethnicity type and update OnboardingData in `types/onboarding.ts`**

After the `Religion` type (line 51), add:

```typescript
export type Ethnicity =
  | 'Black / African Descent'
  | 'White / Caucasian'
  | 'Hispanic / Latino'
  | 'Asian'
  | 'South Asian'
  | 'Middle Eastern'
  | 'Native American'
  | 'Pacific Islander'
  | 'Other'
  | 'Prefer not to say';
```

In `OnboardingData` interface, after `hasKids`:
```typescript
  ethnicity: Ethnicity[];
```

In `INITIAL_ONBOARDING_DATA`, after `hasKids: null`:
```typescript
  ethnicity: [],
```

- [ ] **Step 3: Commit**

```bash
git add types/database.ts types/onboarding.ts
git commit -m "feat: add Ethnicity type and update database/onboarding types"
```

---

### Task 3: Onboarding Mapper

**Files:**
- Modify: `lib/utils/onboarding-mapper.ts`

- [ ] **Step 1: Add ethnicity to `mapOnboardingDataToProfile`**

In the return object (after `has_kids` line ~85), add:

```typescript
    ethnicity: onboardingData.ethnicity,
```

- [ ] **Step 2: Add ethnicity to `mapProfileToOnboardingData`**

In the return object (after `hasKids` line ~116), add:

```typescript
    ethnicity: Array.isArray((profile as any).ethnicity) ? (profile as any).ethnicity : [],
```

- [ ] **Step 3: Commit**

```bash
git add lib/utils/onboarding-mapper.ts
git commit -m "feat: map ethnicity in onboarding mapper"
```

---

### Task 4: Onboarding Screen

**Files:**
- Create: `app/(auth)/onboarding/ethnicity.tsx`
- Modify: `app/(auth)/onboarding/_layout.tsx` (add screen)
- Modify: `app/(auth)/onboarding/religion.tsx` (navigate to ethnicity instead of vices)

- [ ] **Step 1: Create the ethnicity onboarding screen**

Create `app/(auth)/onboarding/ethnicity.tsx`:

```tsx
import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { track } from '@/lib/utils/analytics';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { Ethnicity } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ETHNICITY_OPTIONS: Ethnicity[] = [
  'Black / African Descent',
  'White / Caucasian',
  'Hispanic / Latino',
  'Asian',
  'South Asian',
  'Middle Eastern',
  'Native American',
  'Pacific Islander',
  'Other',
  'Prefer not to say',
];

export default function OnboardingEthnicity() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const canContinue = data.ethnicity.length > 0;

  const toggle = (option: Ethnicity) => {
    const current = data.ethnicity;
    const next = current.includes(option)
      ? current.filter((e) => e !== option)
      : [...current, option];
    updateData({ ethnicity: next });
  };

  const handleNext = () => {
    if (canContinue) {
      track('onboarding_step_completed', { step: 'ethnicity', index: 2 });
      (navigation as any).navigate('vices');
    }
  };

  return (
    <OnboardingContainer currentStep={3} totalSteps={14} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{"What's your ethnicity?"}</Text>
          <Text style={styles.subtitle}>Select all that apply</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.pillRow}>
            {ETHNICITY_OPTIONS.map((option) => {
              const isSelected = data.ethnicity.includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => toggle(option)}
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
```

- [ ] **Step 2: Add ethnicity screen to onboarding layout**

In `app/(auth)/onboarding/_layout.tsx`, add after the `religion` screen:

```tsx
      <Stack.Screen name="ethnicity" />
```

- [ ] **Step 3: Update religion.tsx navigation**

In `app/(auth)/onboarding/religion.tsx`, change the navigate target from `'vices'` to `'ethnicity'`:

```typescript
      (navigation as any).navigate('ethnicity');
```

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/onboarding/ethnicity.tsx app/(auth)/onboarding/_layout.tsx app/(auth)/onboarding/religion.tsx
git commit -m "feat: add ethnicity multi-select onboarding screen"
```

---

### Task 5: Update Onboarding Step Numbers

**Files:**
- Modify: `app/(auth)/onboarding/vices.tsx` (step 3→4)
- Modify: `app/(auth)/onboarding/kids.tsx` (step 4→5)
- Modify: `app/(auth)/onboarding/intent.tsx` (step 5→6)
- Modify: `app/(auth)/onboarding/select-home-gym.tsx` (step 6→7)
- Modify: `app/(auth)/onboarding/fitness.tsx` (step 7→8)
- Modify: `app/(auth)/onboarding/frequency.tsx` (step 8→9)
- Modify: `app/(auth)/onboarding/gym-preferences.tsx` (step 9→10)
- Modify: `app/(auth)/onboarding/photos.tsx` (step 13→14)
- Modify: `app/(auth)/onboarding/prompt-section.tsx` (TOTAL_STEPS 13→14)
- Modify: `app/(auth)/onboarding/religion.tsx` (totalSteps 13→14)

All screens need `totalSteps` changed from `13` to `14`. Screens at currentStep >= 3 need their step number incremented by 1.

- [ ] **Step 1: Update each file**

| File | Change |
|------|--------|
| `religion.tsx` | `totalSteps={14}` (currentStep stays 2) |
| `vices.tsx` | `currentStep={4} totalSteps={14}` |
| `kids.tsx` | `currentStep={5} totalSteps={14}` |
| `intent.tsx` | `currentStep={6} totalSteps={14}` |
| `select-home-gym.tsx` | `currentStep={7} totalSteps={14}` |
| `fitness.tsx` | `currentStep={8} totalSteps={14}` |
| `frequency.tsx` | `currentStep={9} totalSteps={14}` |
| `gym-preferences.tsx` | `currentStep={10} totalSteps={14}` |
| `photos.tsx` | `currentStep={14} totalSteps={14}` |
| `prompt-section.tsx` | `const TOTAL_STEPS = 14;` |

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/onboarding/vices.tsx app/(auth)/onboarding/kids.tsx app/(auth)/onboarding/intent.tsx app/(auth)/onboarding/select-home-gym.tsx app/(auth)/onboarding/fitness.tsx app/(auth)/onboarding/frequency.tsx app/(auth)/onboarding/gym-preferences.tsx app/(auth)/onboarding/photos.tsx app/(auth)/onboarding/prompt-section.tsx app/(auth)/onboarding/religion.tsx
git commit -m "chore: bump onboarding step numbers for new ethnicity screen"
```

---

### Task 6: ProfileLifestyleBox Display

**Files:**
- Modify: `components/profile/ProfileLifestyleBox.tsx`

- [ ] **Step 1: Add ethnicity prop and display row**

Add `ethnicity: string[] | null` to `ProfileLifestyleBoxProps`.

Add a new row at the top of the box (before the existing RELIGION/KIDS row) that spans the full width for ethnicity:

```tsx
export const ProfileLifestyleBox = React.memo<ProfileLifestyleBoxProps>(({
  ethnicity,
  religion,
  alcohol,
  smoking,
  marijuana,
  hasKids,
}) => {
  const ethnicityDisplay = ethnicity && ethnicity.length > 0
    ? ethnicity.join(', ')
    : '—';

  return (
    <View style={styles.infoBox}>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>ETHNICITY</Text>
          <Text variant="bodySmall" weight="semibold">{ethnicityDisplay}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>RELIGION</Text>
          <Text variant="bodySmall" weight="semibold">{religion ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>KIDS</Text>
          <Text variant="bodySmall" weight="semibold">{hasKids ?? '—'}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>ALCOHOL</Text>
          <Text variant="bodySmall" weight="semibold">{alcohol ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>CIGS</Text>
          <Text variant="bodySmall" weight="semibold">{smoking ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>POT</Text>
          <Text variant="bodySmall" weight="semibold">{marijuana ?? '—'}</Text>
        </View>
      </View>
    </View>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add components/profile/ProfileLifestyleBox.tsx
git commit -m "feat: display ethnicity in ProfileLifestyleBox"
```

---

### Task 7: Pass Ethnicity Prop to All ProfileLifestyleBox Callers

**Files:**
- Modify: `components/profile/OtherUserProfileContent.tsx` (~line 209)
- Modify: `components/profile/ProfileView.tsx` (~line 238)
- Modify: `components/discover/SwipeDeck/index.tsx` (~line 756)
- Modify: `components/discover/SwipeDeck/ProfileDetailSheet.tsx` (~line 99)

- [ ] **Step 1: Add ethnicity prop to each caller**

Each caller currently passes props like:
```tsx
<ProfileLifestyleBox
  religion={(profile as any).religion ?? null}
  ...
/>
```

Add to each:
```tsx
  ethnicity={Array.isArray((profile as any).ethnicity) ? (profile as any).ethnicity : null}
```

Use `topProfile` instead of `profile` in `SwipeDeck/index.tsx`.

- [ ] **Step 2: Commit**

```bash
git add components/profile/OtherUserProfileContent.tsx components/profile/ProfileView.tsx components/discover/SwipeDeck/index.tsx components/discover/SwipeDeck/ProfileDetailSheet.tsx
git commit -m "feat: pass ethnicity prop to all ProfileLifestyleBox callers"
```

---

### Task 8: Edit Profile — Ethnicity Multi-Select

**Files:**
- Modify: `app/(tabs)/profile/edit.tsx`

- [ ] **Step 1: Add state, options, initializer, and save logic**

After the `hasKids` state declaration (~line 199), add:
```typescript
  const [ethnicity, setEthnicity] = useState<string[]>([])
```

Add a toggle function after `toggleDiscipline` (~line 288):
```typescript
  const toggleEthnicity = useCallback((value: string) => {
    setEthnicity((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value],
    )
  }, [])
```

In the `useEffect` that initializes from profile (~line 227, after `setHasKids`), add:
```typescript
    setEthnicity(Array.isArray((profile as any).ethnicity) ? (profile as any).ethnicity : [])
```

In the auto-save updates object (~line 516, after the `has_kids` line), add:
```typescript
            ethnicity,
```

In the auto-save dependency array (~line 578, after `hasKids`), add:
```typescript
    ethnicity,
```

- [ ] **Step 2: Add ethnicity UI section**

In the Lifestyle section, after the Kids `<Select>` field (~line 735), before the closing `</View>` of the Lifestyle section, add:

```tsx
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Ethnicity</Text>
              <View style={styles.disciplineWrap}>
                {[
                  'Black / African Descent',
                  'White / Caucasian',
                  'Hispanic / Latino',
                  'Asian',
                  'South Asian',
                  'Middle Eastern',
                  'Native American',
                  'Pacific Islander',
                  'Other',
                  'Prefer not to say',
                ].map((opt) => {
                  const selected = ethnicity.includes(opt)
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => toggleEthnicity(opt)}
                      style={[
                        styles.disciplineChip,
                        selected && styles.disciplineChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.disciplineChipText,
                          selected && styles.disciplineChipTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/profile/edit.tsx
git commit -m "feat: add ethnicity multi-select to edit profile"
```

---

### Task 9: Update TODO and Final Verification

**Files:**
- Modify: `doc/TODO.md`

- [ ] **Step 1: Mark the TODO item as done**

Change `- [ ] **Add race to profile and info box**` to `- [x] **Add race to profile and info box**`

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expect: no new errors (pre-existing playground mock errors are fine).

- [ ] **Step 3: Commit**

```bash
git add doc/TODO.md
git commit -m "chore: mark ethnicity TODO as complete"
```
