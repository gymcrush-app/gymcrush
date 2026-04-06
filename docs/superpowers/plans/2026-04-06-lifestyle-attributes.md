# Lifestyle Attributes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add religion, alcohol, smoking, marijuana, and has_kids attributes to user profiles with onboarding, display, and edit support.

**Architecture:** Five new nullable TEXT columns on `profiles` table with CHECK constraints. Three new onboarding screens (religion, vices, kids) between basic-info and intent. New `ProfileLifestyleBox` component for display. Lifestyle section added to edit profile with auto-save integration.

**Tech Stack:** React Native / Expo Router, Supabase (Postgres), Zustand, React Query, TypeScript

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/00030_add_lifestyle_attributes.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Add lifestyle attributes to profiles
ALTER TABLE profiles
  ADD COLUMN religion TEXT CHECK (religion IN ('Atheist','Jewish','Muslim','Christian','Catholic','Buddhist','Hindu','Sikh','Spiritual','Other')),
  ADD COLUMN alcohol TEXT CHECK (alcohol IN ('Yes','No','Sometimes')),
  ADD COLUMN smoking TEXT CHECK (smoking IN ('Yes','No','Sometimes')),
  ADD COLUMN marijuana TEXT CHECK (marijuana IN ('Yes','No','Sometimes')),
  ADD COLUMN has_kids TEXT CHECK (has_kids IN ('Yes','No'));
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db reset` or `npx supabase migration up`
Expected: Migration applies successfully, no errors.

- [ ] **Step 3: Regenerate TypeScript types**

Run: `npx supabase gen types typescript --local > types/database.ts`
Expected: `types/database.ts` now includes `religion`, `alcohol`, `smoking`, `marijuana`, `has_kids` fields in the profiles Row/Insert/Update types.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00030_add_lifestyle_attributes.sql types/database.ts
git commit -m "feat: add lifestyle attributes columns to profiles table"
```

---

### Task 2: Update OnboardingData Types and Store

**Files:**
- Modify: `types/onboarding.ts:64-102` (OnboardingData interface + INITIAL_ONBOARDING_DATA)

- [ ] **Step 1: Add lifestyle types and fields to OnboardingData**

In `types/onboarding.ts`, add these type aliases before the `OnboardingData` interface:

```typescript
export type Religion = 'Atheist' | 'Jewish' | 'Muslim' | 'Christian' | 'Catholic' | 'Buddhist' | 'Hindu' | 'Sikh' | 'Spiritual' | 'Other';

export type YesNoSometimes = 'Yes' | 'No' | 'Sometimes';

export type YesNo = 'Yes' | 'No';
```

Add these fields to the `OnboardingData` interface (after `occupation`):

```typescript
religion: Religion | null;
alcohol: YesNoSometimes | null;
smoking: YesNoSometimes | null;
marijuana: YesNoSometimes | null;
hasKids: YesNo | null;
```

Add to `INITIAL_ONBOARDING_DATA` (after `occupation: null`):

```typescript
religion: null,
alcohol: null,
smoking: null,
marijuana: null,
hasKids: null,
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors (the onboarding store uses `OnboardingData` and `INITIAL_ONBOARDING_DATA` — since we added nullable fields with null defaults, existing usage is compatible).

- [ ] **Step 3: Commit**

```bash
git add types/onboarding.ts
git commit -m "feat: add lifestyle fields to OnboardingData type"
```

---

### Task 3: Update Onboarding Mapper

**Files:**
- Modify: `lib/utils/onboarding-mapper.ts:67-81` (mapOnboardingDataToProfile return)
- Modify: `lib/utils/onboarding-mapper.ts:87-116` (mapProfileToOnboardingData return)

- [ ] **Step 1: Add lifestyle fields to mapOnboardingDataToProfile**

In the return object of `mapOnboardingDataToProfile` (after `occupation: onboardingData.occupation ?? null,`), add:

```typescript
religion: onboardingData.religion ?? null,
alcohol: onboardingData.alcohol ?? null,
smoking: onboardingData.smoking ?? null,
marijuana: onboardingData.marijuana ?? null,
has_kids: onboardingData.hasKids ?? null,
```

- [ ] **Step 2: Add lifestyle fields to mapProfileToOnboardingData**

In the return object of `mapProfileToOnboardingData` (after `occupation: profile.occupation ?? null,`), add:

```typescript
religion: (profile as any).religion ?? null,
alcohol: (profile as any).alcohol ?? null,
smoking: (profile as any).smoking ?? null,
marijuana: (profile as any).marijuana ?? null,
hasKids: (profile as any).has_kids ?? null,
```

Note: We use `as any` because the profile type from the database may not yet have the new fields if types haven't been regenerated in this context. Once `types/database.ts` is regenerated (Task 1 Step 3), these casts can be removed. If types are already regenerated, skip the `as any`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/utils/onboarding-mapper.ts
git commit -m "feat: map lifestyle attributes in onboarding mapper"
```

---

### Task 4: Religion Onboarding Screen

**Files:**
- Create: `app/(auth)/onboarding/religion.tsx`
- Modify: `app/(auth)/onboarding/_layout.tsx:9-19` (add screen)
- Modify: `app/(auth)/onboarding/basic-info.tsx:191` (navigate to religion instead of intent)

- [ ] **Step 1: Create religion.tsx**

Create `app/(auth)/onboarding/religion.tsx`. This follows the same pattern as `intent.tsx` but with single-select pill buttons:

```tsx
import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { Religion } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const RELIGION_OPTIONS: { value: Religion; label: string }[] = [
  { value: 'Atheist', label: 'Atheist' },
  { value: 'Jewish', label: 'Jewish' },
  { value: 'Muslim', label: 'Muslim' },
  { value: 'Christian', label: 'Christian' },
  { value: 'Catholic', label: 'Catholic' },
  { value: 'Buddhist', label: 'Buddhist' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Sikh', label: 'Sikh' },
  { value: 'Spiritual', label: 'Spiritual' },
  { value: 'Other', label: 'Other' },
];

export default function OnboardingReligion() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const handleSelect = (value: Religion) => {
    updateData({ religion: value });
  };

  const handleNext = () => {
    if (data.religion) {
      (navigation as any).navigate('vices');
    }
  };

  return (
    <OnboardingContainer currentStep={2} totalSteps={17} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What's your faith?</Text>
          <Text style={styles.subtitle}>Select the one that best describes you</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.optionsWrap}>
            {RELIGION_OPTIONS.map((option) => {
              const isSelected = data.religion === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      isSelected && styles.optionButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FloatingActionButton onPress={handleNext} disabled={!data.religion}>
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
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'center',
  },
  optionButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  optionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  optionButtonTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
```

- [ ] **Step 2: Add religion screen to onboarding layout**

In `app/(auth)/onboarding/_layout.tsx`, add after the `basic-info` screen line:

```tsx
<Stack.Screen name="religion" />
```

- [ ] **Step 3: Update basic-info navigation to go to religion**

In `app/(auth)/onboarding/basic-info.tsx`, change line 191 from:
```tsx
(navigation as any).navigate('intent');
```
to:
```tsx
(navigation as any).navigate('religion');
```

- [ ] **Step 4: Update basic-info totalSteps from 14 to 17**

In `app/(auth)/onboarding/basic-info.tsx`, change `totalSteps={14}` to `totalSteps={17}`.

- [ ] **Step 5: Verify the screen renders**

Run the app, go through onboarding to basic-info, fill in required fields, tap Continue.
Expected: Religion screen appears with 10 pill-button options, selecting one enables Continue.

- [ ] **Step 6: Commit**

```bash
git add app/(auth)/onboarding/religion.tsx app/(auth)/onboarding/_layout.tsx app/(auth)/onboarding/basic-info.tsx
git commit -m "feat: add religion onboarding screen"
```

---

### Task 5: Vices Onboarding Screen

**Files:**
- Create: `app/(auth)/onboarding/vices.tsx`
- Modify: `app/(auth)/onboarding/_layout.tsx` (add screen)

- [ ] **Step 1: Create vices.tsx**

Create `app/(auth)/onboarding/vices.tsx`:

```tsx
import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { YesNoSometimes } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const YES_NO_SOMETIMES: { value: YesNoSometimes; label: string }[] = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Sometimes', label: 'Sometimes' },
];

interface ViceSectionProps {
  label: string;
  value: YesNoSometimes | null;
  onSelect: (value: YesNoSometimes) => void;
}

function ViceSection({ label, value, onSelect }: ViceSectionProps) {
  return (
    <View style={styles.viceSection}>
      <Text style={styles.viceLabel}>{label}</Text>
      <View style={styles.viceRow}>
        {YES_NO_SOMETIMES.map((option) => {
          const isSelected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  isSelected && styles.optionButtonTextSelected,
                ]}
              >
                {option.label}
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

  const canContinue = data.alcohol !== null && data.smoking !== null && data.marijuana !== null;

  const handleNext = () => {
    if (canContinue) {
      (navigation as any).navigate('kids');
    }
  };

  return (
    <OnboardingContainer currentStep={3} totalSteps={17} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your lifestyle</Text>
          <Text style={styles.subtitle}>Help others know what to expect</Text>
        </View>

        <View style={styles.content}>
          <ViceSection
            label="Alcohol"
            value={data.alcohol}
            onSelect={(value) => updateData({ alcohol: value })}
          />
          <ViceSection
            label="Cigarettes"
            value={data.smoking}
            onSelect={(value) => updateData({ smoking: value })}
          />
          <ViceSection
            label="Marijuana"
            value={data.marijuana}
            onSelect={(value) => updateData({ marijuana: value })}
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
    gap: spacing[8],
  },
  viceSection: {
    gap: spacing[2],
  },
  viceLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  viceRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  optionButton: {
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
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  optionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  optionButtonTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
```

- [ ] **Step 2: Add vices screen to onboarding layout**

In `app/(auth)/onboarding/_layout.tsx`, add after the `religion` screen line:

```tsx
<Stack.Screen name="vices" />
```

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/onboarding/vices.tsx app/(auth)/onboarding/_layout.tsx
git commit -m "feat: add vices onboarding screen (alcohol, cigs, marijuana)"
```

---

### Task 6: Kids Onboarding Screen

**Files:**
- Create: `app/(auth)/onboarding/kids.tsx`
- Modify: `app/(auth)/onboarding/_layout.tsx` (add screen)

- [ ] **Step 1: Create kids.tsx**

Create `app/(auth)/onboarding/kids.tsx`:

```tsx
import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { YesNo } from '@/types/onboarding';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const KIDS_OPTIONS: { value: YesNo; label: string }[] = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

export default function OnboardingKids() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const handleNext = () => {
    if (data.hasKids) {
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
          <View style={styles.optionsRow}>
            {KIDS_OPTIONS.map((option) => {
              const isSelected = data.hasKids === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => updateData({ hasKids: option.value })}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      isSelected && styles.optionButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FloatingActionButton onPress={handleNext} disabled={!data.hasKids}>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[32],
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'center',
  },
  optionButton: {
    flex: 1,
    maxWidth: 160,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  optionButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  optionButtonTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
```

- [ ] **Step 2: Add kids screen to onboarding layout**

In `app/(auth)/onboarding/_layout.tsx`, add after the `vices` screen line:

```tsx
<Stack.Screen name="kids" />
```

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/onboarding/kids.tsx app/(auth)/onboarding/_layout.tsx
git commit -m "feat: add kids onboarding screen"
```

---

### Task 7: Update Step Numbers Across All Onboarding Screens

**Files:**
- Modify: `app/(auth)/onboarding/intent.tsx:34` (step 2 → 5)
- Modify: `app/(auth)/onboarding/select-home-gym.tsx:132` (step 3 → 6)
- Modify: `app/(auth)/onboarding/fitness.tsx:33` (step 4 → 7)
- Modify: `app/(auth)/onboarding/frequency.tsx:25` (step 5 → 8)
- Modify: `app/(auth)/onboarding/gym-preferences.tsx:26` (step 6 → 9)
- Modify: `app/(auth)/onboarding/prompt-section.tsx:12,64` (TOTAL_STEPS 14 → 17, base step 7 → 10)
- Modify: `app/(auth)/onboarding/photos.tsx:82` (step 14 → 17)

With 3 new screens after basic-info, all subsequent steps shift by +3. Total steps changes from 14 to 17.

- [ ] **Step 1: Update intent.tsx**

Change `currentStep={2}` to `currentStep={5}` and `totalSteps={14}` to `totalSteps={17}`.

- [ ] **Step 2: Update select-home-gym.tsx**

Change `currentStep={3}` to `currentStep={6}` and `totalSteps={14}` to `totalSteps={17}`.

- [ ] **Step 3: Update fitness.tsx**

Change `currentStep={4}` to `currentStep={7}` and `totalSteps={14}` to `totalSteps={17}`.

- [ ] **Step 4: Update frequency.tsx**

Change `currentStep={5}` to `currentStep={8}` and `totalSteps={14}` to `totalSteps={17}`.

- [ ] **Step 5: Update gym-preferences.tsx**

Change `currentStep={6}` to `currentStep={9}` and `totalSteps={14}` to `totalSteps={17}`.

- [ ] **Step 6: Update prompt-section.tsx**

Change `const TOTAL_STEPS = 14;` to `const TOTAL_STEPS = 17;` and change `const currentStep = 7 + sectionIdx;` to `const currentStep = 10 + sectionIdx;`.

- [ ] **Step 7: Update photos.tsx**

Change `currentStep={14}` to `currentStep={17}` and `totalSteps={14}` to `totalSteps={17}`.

- [ ] **Step 8: Commit**

```bash
git add app/(auth)/onboarding/intent.tsx app/(auth)/onboarding/select-home-gym.tsx app/(auth)/onboarding/fitness.tsx app/(auth)/onboarding/frequency.tsx app/(auth)/onboarding/gym-preferences.tsx app/(auth)/onboarding/prompt-section.tsx app/(auth)/onboarding/photos.tsx
git commit -m "fix: update onboarding step numbers for 3 new lifestyle screens"
```

---

### Task 8: ProfileLifestyleBox Component

**Files:**
- Create: `components/profile/ProfileLifestyleBox.tsx`

- [ ] **Step 1: Create ProfileLifestyleBox.tsx**

Create `components/profile/ProfileLifestyleBox.tsx`, following the same pattern as `ProfileInfoBox.tsx`:

```tsx
import { Text } from '@/components/ui/Text';
import { borderRadius, colors, spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProfileLifestyleBoxProps {
  religion: string | null;
  alcohol: string | null;
  smoking: string | null;
  marijuana: string | null;
  hasKids: string | null;
}

export const ProfileLifestyleBox = React.memo<ProfileLifestyleBoxProps>(({
  religion,
  alcohol,
  smoking,
  marijuana,
  hasKids,
}) => {
  return (
    <View style={styles.infoBox}>
      {/* Top row: 3 columns */}
      <View style={styles.topRow}>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>RELIGION</Text>
          <Text variant="bodySmall" weight="semibold">{religion ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>ALCOHOL</Text>
          <Text variant="bodySmall" weight="semibold">{alcohol ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>CIGS</Text>
          <Text variant="bodySmall" weight="semibold">{smoking ?? '—'}</Text>
        </View>
      </View>
      {/* Bottom row: 2 columns */}
      <View style={styles.bottomRow}>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>POT</Text>
          <Text variant="bodySmall" weight="semibold">{marijuana ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>KIDS</Text>
          <Text variant="bodySmall" weight="semibold">{hasKids ?? '—'}</Text>
        </View>
      </View>
    </View>
  );
});

ProfileLifestyleBox.displayName = 'ProfileLifestyleBox';

const styles = StyleSheet.create({
  infoBox: {
    backgroundColor: `${colors.card}E6`,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[4],
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  cell: {
    flex: 1,
  },
  label: {
    marginBottom: spacing[1],
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/profile/ProfileLifestyleBox.tsx
git commit -m "feat: add ProfileLifestyleBox component"
```

---

### Task 9: Add ProfileLifestyleBox to Profile Views

**Files:**
- Modify: `components/profile/ProfileView.tsx:214-219` (add lifestyle box after ProfileInfoBox)
- Modify: `components/profile/ProfileDetailContent.tsx:29-34` (add lifestyle box after ProfileInfoBox)
- Modify: `components/profile/ProfileDetailContent.tsx:5-11` (update props)
- Modify: `components/discover/SwipeDeck/ProfileDetailSheet.tsx:66-72` (pass lifestyle props)
- Modify: `components/profile/OtherUserProfileContent.tsx:194-199` (pass lifestyle props)

- [ ] **Step 1: Update ProfileDetailContent to accept and render lifestyle props**

In `components/profile/ProfileDetailContent.tsx`, update the interface and component:

```tsx
import { AboutSection } from "@/components/profile/AboutSection"
import { ProfileInfoBox } from "@/components/profile/ProfileInfoBox"
import { ProfileLifestyleBox } from "@/components/profile/ProfileLifestyleBox"
import React from "react"

export interface ProfileDetailContentProps {
  height: string | null
  intent: string
  occupation: string | null
  city: string | null
  bio: string | null
  religion?: string | null
  alcohol?: string | null
  smoking?: string | null
  marijuana?: string | null
  hasKids?: string | null
  children?: React.ReactNode
}

export function ProfileDetailContent({
  height,
  intent,
  occupation,
  city,
  bio,
  religion,
  alcohol,
  smoking,
  marijuana,
  hasKids,
  children,
}: ProfileDetailContentProps) {
  return (
    <>
      <ProfileInfoBox
        height={height}
        intent={intent}
        occupation={occupation}
        city={city}
      />
      <ProfileLifestyleBox
        religion={religion ?? null}
        alcohol={alcohol ?? null}
        smoking={smoking ?? null}
        marijuana={marijuana ?? null}
        hasKids={hasKids ?? null}
      />
      <AboutSection bio={bio} />
      {children}
    </>
  )
}
```

- [ ] **Step 2: Update ProfileDetailSheet to pass lifestyle props**

In `components/discover/SwipeDeck/ProfileDetailSheet.tsx`, after the existing profile field extractions (around line 45), add:

```tsx
const religion = (profile as any).religion ?? null;
const alcohol = (profile as any).alcohol ?? null;
const smoking = (profile as any).smoking ?? null;
const marijuana = (profile as any).marijuana ?? null;
const hasKids = (profile as any).has_kids ?? null;
```

Then pass to `ProfileDetailContent`:

```tsx
<ProfileDetailContent
  height={height}
  intent={formattedIntents}
  occupation={profile.occupation ?? null}
  city={profileGym?.city ?? null}
  bio={profile.bio ?? null}
  religion={religion}
  alcohol={alcohol}
  smoking={smoking}
  marijuana={marijuana}
  hasKids={hasKids}
/>
```

- [ ] **Step 3: Update OtherUserProfileContent to pass lifestyle props**

In `components/profile/OtherUserProfileContent.tsx`, where `ProfileDetailContent` is rendered (around line 194), add the lifestyle props:

```tsx
<ProfileDetailContent
  height={profile.height ?? null}
  intent={formattedIntents}
  occupation={profile.occupation ?? null}
  city={profileGym?.city ?? null}
  bio={profile.bio || null}
  religion={(profile as any).religion ?? null}
  alcohol={(profile as any).alcohol ?? null}
  smoking={(profile as any).smoking ?? null}
  marijuana={(profile as any).marijuana ?? null}
  hasKids={(profile as any).has_kids ?? null}
>
```

- [ ] **Step 4: Update ProfileView to add lifestyle box**

In `components/profile/ProfileView.tsx`, add the import:

```tsx
import { ProfileLifestyleBox } from '@/components/profile/ProfileLifestyleBox';
```

After the `<ProfileInfoBox ... />` block (line ~219), add:

```tsx
<ProfileLifestyleBox
  religion={(profile as any).religion ?? null}
  alcohol={(profile as any).alcohol ?? null}
  smoking={(profile as any).smoking ?? null}
  marijuana={(profile as any).marijuana ?? null}
  hasKids={(profile as any).has_kids ?? null}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add components/profile/ProfileDetailContent.tsx components/profile/ProfileView.tsx components/discover/SwipeDeck/ProfileDetailSheet.tsx components/profile/OtherUserProfileContent.tsx
git commit -m "feat: display lifestyle attributes on all profile views"
```

---

### Task 10: Add Lifestyle Section to Edit Profile

**Files:**
- Modify: `app/(tabs)/profile/edit.tsx`

- [ ] **Step 1: Add lifestyle state variables**

After the `heightInches` state declaration (around line 168), add:

```tsx
const [religion, setReligion] = useState<string>('')
const [alcohol, setAlcohol] = useState<string>('')
const [smoking, setSmoking] = useState<string>('')
const [marijuana, setMarijuana] = useState<string>('')
const [hasKids, setHasKids] = useState<string>('')
```

- [ ] **Step 2: Add lifestyle options constants**

After the `heightInchesOptions` memo (around line 166), add:

```tsx
const religionOptions = useMemo(() => [
  { value: 'Atheist', label: 'Atheist' },
  { value: 'Jewish', label: 'Jewish' },
  { value: 'Muslim', label: 'Muslim' },
  { value: 'Christian', label: 'Christian' },
  { value: 'Catholic', label: 'Catholic' },
  { value: 'Buddhist', label: 'Buddhist' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Sikh', label: 'Sikh' },
  { value: 'Spiritual', label: 'Spiritual' },
  { value: 'Other', label: 'Other' },
], [])

const yesNoSometimesOptions = useMemo(() => [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Sometimes', label: 'Sometimes' },
], [])

const yesNoOptions = useMemo(() => [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
], [])
```

- [ ] **Step 3: Initialize lifestyle state from profile**

In the `useEffect` that initializes state from profile (around line 175-193), add after `setHeightInches(inches)`:

```tsx
setReligion((profile as any).religion ?? '')
setAlcohol((profile as any).alcohol ?? '')
setSmoking((profile as any).smoking ?? '')
setMarijuana((profile as any).marijuana ?? '')
setHasKids((profile as any).has_kids ?? '')
```

- [ ] **Step 4: Include lifestyle fields in auto-save**

In the auto-save `useEffect`, update the `optimisticProfile` to include lifestyle fields (around line 382-384):

```tsx
const optimisticProfile: Profile = {
  ...currentProfile,
  display_name: displayNameInput.getFilteredValue().trim(),
  fitness_disciplines: disciplines,
  height: heightFeet && heightInches ? `${heightFeet}'${heightInches}"` : null,
  photo_urls: photoUrls,
  home_gym_id: optimisticHomeGymId,
  ...( religion ? { religion } : {}),
  ...( alcohol ? { alcohol } : {}),
  ...( smoking ? { smoking } : {}),
  ...( marijuana ? { marijuana } : {}),
  ...( hasKids ? { has_kids: hasKids } : {}),
} as Profile;
```

In the `updates` object (around line 465-474), add after the `height` line:

```tsx
...(religion ? { religion } : {}),
...(alcohol ? { alcohol } : {}),
...(smoking ? { smoking } : {}),
...(marijuana ? { marijuana } : {}),
...(hasKids ? { has_kids: hasKids } : {}),
```

Add the lifestyle state variables to the auto-save `useEffect` dependency array (around line 519-531):

```tsx
religion,
alcohol,
smoking,
marijuana,
hasKids,
```

- [ ] **Step 5: Add Lifestyle section to the JSX**

After the `{/* Basics */}` section's closing `</View>` (around line 638), add a new section:

```tsx
{/* Lifestyle */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Lifestyle</Text>
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>Religion</Text>
    <Select
      value={religion}
      onValueChange={setReligion}
      placeholder="Select..."
      options={religionOptions}
    />
  </View>
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>Alcohol</Text>
    <Select
      value={alcohol}
      onValueChange={setAlcohol}
      placeholder="Select..."
      options={yesNoSometimesOptions}
    />
  </View>
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>Cigarettes</Text>
    <Select
      value={smoking}
      onValueChange={setSmoking}
      placeholder="Select..."
      options={yesNoSometimesOptions}
    />
  </View>
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>Marijuana</Text>
    <Select
      value={marijuana}
      onValueChange={setMarijuana}
      placeholder="Select..."
      options={yesNoSometimesOptions}
    />
  </View>
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>Kids</Text>
    <Select
      value={hasKids}
      onValueChange={setHasKids}
      placeholder="Select..."
      options={yesNoOptions}
    />
  </View>
</View>
```

- [ ] **Step 6: Verify the edit profile screen renders correctly**

Run the app, navigate to Profile → Edit Profile.
Expected: New "Lifestyle" section appears with 5 dropdowns. Changing a value triggers auto-save after 700ms.

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/profile/edit.tsx
git commit -m "feat: add lifestyle section to edit profile with auto-save"
```

---

### Task 11: Update Seed Scripts

**Files:**
- Modify: `scripts/seed-profiles.ts:34-45` (add lifestyle fields to test profiles)
- Modify: `scripts/seed-profiles.ts:97-127` (add lifestyle fields to createProfile insert)

- [ ] **Step 1: Add lifestyle data to test profile definitions**

In `scripts/seed-profiles.ts`, update the `testProfiles` array to include lifestyle fields. Add these fields to each profile object:

```typescript
const testProfiles = [
  { name: 'Alex', age: 25, gender: 'male', disciplines: ['bodybuilding', 'powerlifting'], bio: 'Lifting heavy and living life. Always down for a workout partner!', religion: 'Atheist', alcohol: 'Yes', smoking: 'No', marijuana: 'Sometimes', has_kids: 'No' },
  { name: 'Jordan', age: 28, gender: 'female', disciplines: ['yoga', 'functional'], bio: 'Yoga instructor by day, fitness enthusiast by night. Let\'s flow together!', religion: 'Spiritual', alcohol: 'Sometimes', smoking: 'No', marijuana: 'No', has_kids: 'No' },
  { name: 'Sam', age: 23, gender: 'non-binary', disciplines: ['crossfit', 'functional'], bio: 'CrossFit addict looking for training buddies. Let\'s push each other!', religion: 'Other', alcohol: 'Yes', smoking: 'No', marijuana: 'Yes', has_kids: 'No' },
  { name: 'Taylor', age: 30, gender: 'female', disciplines: ['running', 'yoga'], bio: 'Marathon runner and yoga enthusiast. Always training for the next race!', religion: 'Christian', alcohol: 'No', smoking: 'No', marijuana: 'No', has_kids: 'Yes' },
  { name: 'Morgan', age: 26, gender: 'male', disciplines: ['bodybuilding', 'general'], bio: 'Bodybuilder focused on building muscle and strength. Let\'s get big together!', religion: 'Catholic', alcohol: 'Sometimes', smoking: 'Sometimes', marijuana: 'No', has_kids: 'No' },
  { name: 'Casey', age: 24, gender: 'female', disciplines: ['powerlifting', 'olympic'], bio: 'Powerlifter chasing PRs. Looking for someone to spot me!', religion: 'Jewish', alcohol: 'Yes', smoking: 'No', marijuana: 'Sometimes', has_kids: 'No' },
  { name: 'Riley', age: 29, gender: 'male', disciplines: ['crossfit', 'sports'], bio: 'CrossFit coach and former athlete. Always ready for a challenge!', religion: 'Buddhist', alcohol: 'Sometimes', smoking: 'No', marijuana: 'Yes', has_kids: 'Yes' },
  { name: 'Quinn', age: 27, gender: 'non-binary', disciplines: ['yoga', 'functional', 'general'], bio: 'Yoga and functional movement enthusiast. Let\'s move mindfully together!', religion: 'Hindu', alcohol: 'No', smoking: 'No', marijuana: 'No', has_kids: 'No' },
  { name: 'Dakota', age: 31, gender: 'female', disciplines: ['bodybuilding', 'running'], bio: 'Fitness model and runner. Balancing strength and cardio!', religion: 'Muslim', alcohol: 'No', smoking: 'No', marijuana: 'No', has_kids: 'Yes' },
  { name: 'Avery', age: 22, gender: 'male', disciplines: ['powerlifting', 'olympic', 'bodybuilding'], bio: 'Competitive powerlifter. Always training for the next meet!', religion: 'Sikh', alcohol: 'Yes', smoking: 'Sometimes', marijuana: 'Sometimes', has_kids: 'No' },
];
```

- [ ] **Step 2: Include lifestyle fields in createProfile insert**

In the `createProfile` function's `.insert()` call, add after `discovery_preferences`:

```typescript
religion: profileData.religion,
alcohol: profileData.alcohol,
smoking: profileData.smoking,
marijuana: profileData.marijuana,
has_kids: profileData.has_kids,
```

- [ ] **Step 3: Update seed-female-users-with-likes.ts similarly**

Check `scripts/seed-female-users-with-likes.ts` for profile inserts and add lifestyle fields with randomized values there as well.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-profiles.ts scripts/seed-female-users-with-likes.ts
git commit -m "feat: add lifestyle attributes to seed scripts"
```
