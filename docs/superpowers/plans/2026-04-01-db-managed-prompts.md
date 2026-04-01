# DB-Managed Profile Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded profile prompts with a database-managed system — 7 sections × 10 prompts, one answer per section per user, persisted and displayed from the DB.

**Architecture:** Three new Supabase tables (`prompt_sections`, `prompts`, `profile_prompts`) seeded via migration. New API hooks fetch sections/prompts and upsert answers. Onboarding replaces 1 prompt screen with 7 per-section screens. Edit profile gets a new prompts section. SwipeDeck/ProfileDetailSheet wired to real data.

**Tech Stack:** Supabase (Postgres + RLS), React Native (Expo Router), TanStack Query, Zustand, @gorhom/bottom-sheet

---

## File Structure

### New Files
- `supabase/migrations/00030_create_prompt_tables.sql` — tables, RLS, seed data
- `supabase/migrations/00031_drop_approach_prompt.sql` — drop legacy column
- `lib/api/prompts.ts` — TanStack Query hooks for prompts
- `app/(auth)/onboarding/prompt-section.tsx` — reusable per-section onboarding screen

### Modified Files
- `types/database.ts` — add types for new tables
- `types/onboarding.ts` — update `PromptAnswer` type, remove `FITNESS_PROMPTS`
- `lib/stores/onboardingStore.ts` — no structural changes, just stores updated `PromptAnswer[]`
- `lib/utils/onboarding-mapper.ts` — remove `approach_prompt` mapping
- `lib/utils/validation.ts` — update prompts validation for 7 required
- `app/(auth)/onboarding/_layout.tsx` — replace single prompts screen with 7 section screens
- `app/(auth)/onboarding/complete.tsx` — insert `profile_prompts` rows on completion
- `app/(tabs)/profile/edit.tsx` — add prompts editing section
- `components/discover/SwipeDeck/index.tsx` — remove `mockPrompts`, use real data
- `components/discover/SwipeDeck/ProfileDetailSheet.tsx` — accept real prompts instead of mock
- `lib/api/profiles.ts` — remove `approach_prompt` filtering
- `theme/tokens.ts` — remove `MAX_APPROACH_PROMPT_LENGTH`

---

### Task 1: Database Migration — Create Tables & Seed Data

**Files:**
- Create: `supabase/migrations/00030_create_prompt_tables.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Create prompt_sections table
CREATE TABLE prompt_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subtitle text NOT NULL,
  display_order int NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create prompts table
CREATE TABLE prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES prompt_sections(id) ON DELETE CASCADE,
  prompt_text text NOT NULL,
  display_order int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section_id, display_order)
);

-- Create profile_prompts table
CREATE TABLE profile_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES prompt_sections(id) ON DELETE CASCADE,
  answer text NOT NULL,
  engagement_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, section_id)
);

-- Indexes
CREATE INDEX idx_profile_prompts_profile_id ON profile_prompts(profile_id);
CREATE INDEX idx_prompts_section_id ON prompts(section_id);

-- RLS
ALTER TABLE prompt_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_prompts ENABLE ROW LEVEL SECURITY;

-- prompt_sections: read-only for authenticated users
CREATE POLICY "Authenticated users can read prompt_sections"
  ON prompt_sections FOR SELECT
  TO authenticated
  USING (true);

-- prompts: read-only for authenticated users
CREATE POLICY "Authenticated users can read prompts"
  ON prompts FOR SELECT
  TO authenticated
  USING (true);

-- profile_prompts: read for authenticated, write for own
CREATE POLICY "Authenticated users can read all profile_prompts"
  ON profile_prompts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile_prompts"
  ON profile_prompts FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own profile_prompts"
  ON profile_prompts FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own profile_prompts"
  ON profile_prompts FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Seed sections
INSERT INTO prompt_sections (name, subtitle, display_order) VALUES
  ('Who I Am', 'personality, quirks, daily life', 1),
  ('How I Think', 'values, opinions, worldview', 2),
  ('What I''m Into', 'passions, hobbies, obsessions', 3),
  ('Where I''m Headed', 'goals, lifestyle, ambitions', 4),
  ('How I Love', 'relationship style, dealbreakers, what I bring to a partnership', 5),
  ('Let''s Have Fun', 'lighthearted, hypothetical, icebreakers', 6),
  ('Sweat Life', 'gym, fitness, exercise', 7);

-- Seed prompts for each section
-- Who I Am (display_order = 1)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The thing most people don''t realize about me until they know me well is...', 1),
  ('My friends would describe me as _____, but I''d describe myself as...', 2),
  ('The quirk I''ve fully accepted about myself is...', 3),
  ('On a random Tuesday night you''ll probably find me...', 4),
  ('The role I always end up playing in a friend group is...', 5),
  ('I''m a lot more _____ than I probably come across at first', 6),
  ('I recharge by...', 7),
  ('People either love or are puzzled by my obsession with...', 8),
  ('I grew up as the _____ kid and honestly still am', 9),
  ('I''m convinced I was built for...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 1;

-- How I Think (display_order = 2)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The opinion I hold that surprises most people is...', 1),
  ('I will always argue that...', 2),
  ('The thing I''ve changed my mind on completely is...', 3),
  ('I think the most underrated thing in life is...', 4),
  ('The thing society accepts that I quietly disagree with is...', 5),
  ('The question I keep coming back to in life is...', 6),
  ('The older I get the more I believe...', 7),
  ('I judge a person''s character by...', 8),
  ('I think kindness looks like...', 9),
  ('The belief I hold that most people my age don''t seem to share is...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 2;

-- What I'm Into (display_order = 3)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The hobby I can talk about for hours without noticing is...', 1),
  ('I''m currently obsessed with...', 2),
  ('The niche interest I wish more people knew about is...', 3),
  ('The last thing I fell down a rabbit hole about was...', 4),
  ('The thing I''m into that people don''t expect based on how I look is...', 5),
  ('My taste in _____ says everything about me', 6),
  ('I''ve been doing _____ since I was a kid and still love it', 7),
  ('The thing I spend way too much money on without regret is...', 8),
  ('The experience I keep chasing is...', 9),
  ('The interest I wish I had more people in my life to share with is...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 3;

-- Where I'm Headed (display_order = 4)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The life I''m actively building looks like...', 1),
  ('The thing I''m working toward that excites me most right now is...', 2),
  ('My version of "making it" looks like...', 3),
  ('The chapter of life I feel like I''m in right now is...', 4),
  ('I used to think success meant _____ but now I think it means...', 5),
  ('The dream I''ve never fully let go of is...', 6),
  ('I''m building a life that prioritizes...', 7),
  ('I want to look back at this time in my life and know that I...', 8),
  ('The decision I made recently that changed my direction was...', 9),
  ('The thing that keeps me moving forward is...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 4;

-- How I Love (display_order = 5)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('The way I show love that I wish more people understood is...', 1),
  ('I feel most appreciated when...', 2),
  ('I''ve learned that I need someone who...', 3),
  ('The thing I bring to a relationship that I''m most proud of is...', 4),
  ('The green flag I look for immediately is...', 5),
  ('The dealbreaker I used to overlook but won''t anymore is...', 6),
  ('I feel most connected to someone when...', 7),
  ('The thing I want a partner to know upfront is...', 8),
  ('I''m at my best in a relationship when...', 9),
  ('A relationship has to have _____ or it won''t work for me...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 5;

-- Let's Have Fun (display_order = 6)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('I will absolutely destroy you at...', 1),
  ('The most random skill I have is...', 2),
  ('The fictional character I relate to most is...', 3),
  ('My karaoke song is _____ and I commit fully', 4),
  ('I take _____ way too seriously for no reason', 5),
  ('The most niche thing I find attractive is...', 6),
  ('I have an irrational fear of...', 7),
  ('The thing I will never not find funny is...', 8),
  ('If you looked at my recently played on Spotify you''d think...', 9),
  ('If my life were a movie genre it would be...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 6;

-- Sweat Life (display_order = 7)
INSERT INTO prompts (section_id, prompt_text, display_order)
SELECT s.id, p.prompt_text, p.display_order
FROM prompt_sections s,
(VALUES
  ('My current training focus is...', 1),
  ('The workout I''ll never skip no matter what is...', 2),
  ('I train because...', 3),
  ('The progress I''m most proud of is...', 4),
  ('The fitness goal I''m currently chasing is...', 5),
  ('I need a partner who understands that...', 6),
  ('Morning workouts or evening workouts and why...', 7),
  ('The physical challenge on my bucket list is...', 8),
  ('My biggest gym pet peeve is...', 9),
  ('The sport or activity I wish I''d started sooner is...', 10)
) AS p(prompt_text, display_order)
WHERE s.display_order = 7;
```

- [ ] **Step 2: Run the migration locally**

Run: `npx supabase db push` or `npx supabase migration up` (depending on local setup)
Expected: Migration applies successfully, 7 sections and 70 prompts seeded.

- [ ] **Step 3: Verify seed data**

Run in Supabase SQL editor or `psql`:
```sql
SELECT s.name, COUNT(p.id) AS prompt_count
FROM prompt_sections s
JOIN prompts p ON p.section_id = s.id
GROUP BY s.name, s.display_order
ORDER BY s.display_order;
```
Expected: 7 rows, each with `prompt_count = 10`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00030_create_prompt_tables.sql
git commit -m "feat: add prompt_sections, prompts, profile_prompts tables with seed data"
```

---

### Task 2: Database Migration — Drop `approach_prompt`

**Files:**
- Create: `supabase/migrations/00031_drop_approach_prompt.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE profiles DROP COLUMN IF EXISTS approach_prompt;
```

- [ ] **Step 2: Run the migration locally**

Run: `npx supabase db push` or `npx supabase migration up`
Expected: Column dropped successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00031_drop_approach_prompt.sql
git commit -m "feat: drop approach_prompt column from profiles"
```

---

### Task 3: Update TypeScript Types

**Files:**
- Modify: `types/database.ts` — add new table types, remove `approach_prompt`
- Modify: `types/onboarding.ts` — update `PromptAnswer`, remove `FITNESS_PROMPTS` and legacy fields

- [ ] **Step 1: Add new table types to `types/database.ts`**

Find the `Tables` section in `types/database.ts` and add types for the three new tables. Add these type definitions alongside the existing table types. The exact insertion point depends on the file structure, but they go inside the `Tables` object within `public`.

Add after the existing table definitions (before the closing of the `Tables` type):

```typescript
prompt_sections: {
  Row: {
    id: string
    name: string
    subtitle: string
    display_order: number
    created_at: string
  }
  Insert: {
    id?: string
    name: string
    subtitle: string
    display_order: number
    created_at?: string
  }
  Update: {
    id?: string
    name?: string
    subtitle?: string
    display_order?: number
    created_at?: string
  }
}
prompts: {
  Row: {
    id: string
    section_id: string
    prompt_text: string
    display_order: number
    is_active: boolean
    created_at: string
  }
  Insert: {
    id?: string
    section_id: string
    prompt_text: string
    display_order: number
    is_active?: boolean
    created_at?: string
  }
  Update: {
    id?: string
    section_id?: string
    prompt_text?: string
    display_order?: number
    is_active?: boolean
    created_at?: string
  }
}
profile_prompts: {
  Row: {
    id: string
    profile_id: string
    prompt_id: string
    section_id: string
    answer: string
    engagement_count: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    profile_id: string
    prompt_id: string
    section_id: string
    answer: string
    engagement_count?: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    profile_id?: string
    prompt_id?: string
    section_id?: string
    answer?: string
    engagement_count?: number
    created_at?: string
    updated_at?: string
  }
}
```

Also remove `approach_prompt` from the profiles Row, Insert, and Update types.

- [ ] **Step 2: Update `types/onboarding.ts`**

Replace the `PromptAnswer` interface and remove `FITNESS_PROMPTS` + legacy fields.

Replace:
```typescript
export interface PromptAnswer {
  prompt: string
  answer: string
}
```
With:
```typescript
export interface PromptAnswer {
  promptId: string
  sectionId: string
  answer: string
}
```

Remove the entire `FITNESS_PROMPTS` array (lines 109-118).

In `OnboardingData`, remove the legacy fields:
```typescript
  // Legacy fields for backward compatibility (will be removed)
  promptAnswer: string
  selectedPrompt: string
```

In `INITIAL_ONBOARDING_DATA`, remove:
```typescript
  // Legacy fields
  promptAnswer: "",
  selectedPrompt: "",
```

- [ ] **Step 3: Add convenience type exports**

At the bottom of `types/onboarding.ts`, add:
```typescript
/** A prompt section with its prompts, as fetched from the DB */
export interface PromptSectionWithPrompts {
  id: string
  name: string
  subtitle: string
  display_order: number
  prompts: Array<{
    id: string
    prompt_text: string
    display_order: number
    is_active: boolean
  }>
}

/** A profile's prompt answer with prompt text and section info */
export interface ProfilePromptWithDetails {
  id: string
  prompt_id: string
  section_id: string
  answer: string
  engagement_count: number
  prompt_text: string
  section_name: string
  section_display_order: number
}
```

- [ ] **Step 4: Commit**

```bash
git add types/database.ts types/onboarding.ts
git commit -m "feat: update types for DB-managed prompts"
```

---

### Task 4: Prompts API Layer

**Files:**
- Create: `lib/api/prompts.ts`

- [ ] **Step 1: Create the prompts API file**

```typescript
/**
 * Prompts API — TanStack Query hooks for prompt sections, prompts, and profile prompt answers.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { filterBadWords } from '@/lib/utils/filterBadWords';
import type { PromptSectionWithPrompts, ProfilePromptWithDetails } from '@/types/onboarding';

/**
 * Fetch all prompt sections with their active prompts, ordered by display_order.
 * Used by onboarding and edit profile to show available prompts.
 */
export function usePromptSections() {
  return useQuery({
    queryKey: ['prompt-sections'],
    queryFn: async (): Promise<PromptSectionWithPrompts[]> => {
      const { data: sections, error: sectionsError } = await supabase
        .from('prompt_sections')
        .select('*')
        .order('display_order');

      if (sectionsError) throw sectionsError;

      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (promptsError) throw promptsError;

      return (sections ?? []).map((section) => ({
        id: section.id,
        name: section.name,
        subtitle: section.subtitle,
        display_order: section.display_order,
        prompts: (prompts ?? [])
          .filter((p) => p.section_id === section.id)
          .map((p) => ({
            id: p.id,
            prompt_text: p.prompt_text,
            display_order: p.display_order,
            is_active: p.is_active,
          })),
      }));
    },
    staleTime: 1000 * 60 * 60, // 1 hour — prompts rarely change
  });
}

/**
 * Fetch a profile's prompt answers with prompt text and section info.
 * Used by SwipeDeck/ProfileDetailSheet to display real prompt data.
 */
export function useProfilePrompts(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profile-prompts', profileId],
    queryFn: async (): Promise<ProfilePromptWithDetails[]> => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from('profile_prompts')
        .select(`
          id,
          prompt_id,
          section_id,
          answer,
          engagement_count,
          prompts!inner(prompt_text),
          prompt_sections!inner(name, display_order)
        `)
        .eq('profile_id', profileId)
        .order('prompt_sections(display_order)');

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        prompt_id: row.prompt_id,
        section_id: row.section_id,
        answer: row.answer,
        engagement_count: row.engagement_count,
        prompt_text: row.prompts.prompt_text,
        section_name: row.prompt_sections.name,
        section_display_order: row.prompt_sections.display_order,
      }));
    },
    enabled: !!profileId,
    staleTime: 30_000,
  });
}

/**
 * Upsert a profile prompt answer.
 * Used by both onboarding (bulk insert) and edit profile (single update).
 */
export function useUpsertProfilePrompt() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      promptId: string;
      sectionId: string;
      answer: string;
      resetEngagement?: boolean; // true when swapping to a different prompt
    }) => {
      if (!user) throw new Error('Not authenticated');

      const filteredAnswer = filterBadWords(params.answer);

      const upsertData: Record<string, any> = {
        profile_id: user.id,
        prompt_id: params.promptId,
        section_id: params.sectionId,
        answer: filteredAnswer,
        updated_at: new Date().toISOString(),
      };

      if (params.resetEngagement) {
        upsertData.engagement_count = 0;
      }

      const { data, error } = await supabase
        .from('profile_prompts')
        .upsert(upsertData, { onConflict: 'profile_id,section_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-prompts', user?.id] });
    },
  });
}

/**
 * Bulk insert profile prompts during onboarding.
 */
export async function insertProfilePrompts(
  profileId: string,
  answers: Array<{ promptId: string; sectionId: string; answer: string }>
) {
  const rows = answers.map((a) => ({
    profile_id: profileId,
    prompt_id: a.promptId,
    section_id: a.sectionId,
    answer: filterBadWords(a.answer),
  }));

  const { error } = await supabase
    .from('profile_prompts')
    .insert(rows);

  if (error) throw error;
}

/**
 * Increment engagement_count on a profile prompt (when someone taps chat icon).
 */
export function useIncrementEngagement() {
  return useMutation({
    mutationFn: async (profilePromptId: string) => {
      const { error } = await supabase.rpc('increment_engagement_count', {
        p_profile_prompt_id: profilePromptId,
      });
      // Fallback if RPC doesn't exist: use raw update
      if (error) {
        const { error: updateError } = await supabase
          .from('profile_prompts')
          .update({ engagement_count: supabase.rpc ? undefined : 0 })
          .eq('id', profilePromptId);
        // For MVP, silently fail engagement tracking
        if (__DEV__ && updateError) {
          console.warn('[incrementEngagement] failed:', updateError);
        }
      }
    },
  });
}
```

**Note on `incrementEngagement`:** The cleanest approach is a Postgres RPC for atomic increment. For MVP, we can add this later or use a simpler approach. The hook is in place for when we wire it up. For now, the important thing is the data structure exists (`engagement_count` column).

- [ ] **Step 2: Commit**

```bash
git add lib/api/prompts.ts
git commit -m "feat: add prompts API layer with query hooks"
```

---

### Task 5: Update Onboarding Mapper & Validation

**Files:**
- Modify: `lib/utils/onboarding-mapper.ts`
- Modify: `lib/utils/validation.ts`

- [ ] **Step 1: Clean up onboarding-mapper.ts**

In `lib/utils/onboarding-mapper.ts`, remove the `approach_prompt` mapping.

Remove lines 42-50 (the `approachPromptRaw` / `approachPrompt` block):
```typescript
  // Map approach preference to approach_prompt
  // If approachPreference is 'yes' or 'sometimes', use promptAnswer
  const approachPromptRaw =
    onboardingData.approachPreference && 
    onboardingData.approachPreference !== 'no' && 
    onboardingData.promptAnswer
      ? `${onboardingData.selectedPrompt} ${onboardingData.promptAnswer}`
      : null;
  const approachPrompt = approachPromptRaw ? filterBadWords(approachPromptRaw) : null;
```

Remove from the return object:
```typescript
    approach_prompt: approachPrompt,
```

In `mapProfileToOnboardingData`, remove:
```typescript
    promptAnswer: profile.approach_prompt || '',
    selectedPrompt: '', // Would need to parse from approach_prompt
```

- [ ] **Step 2: Update validation.ts**

In `lib/utils/validation.ts`, update the prompts validation in `onboardingSchema` (line 33-36).

Replace:
```typescript
  prompts: z.array(z.object({
    prompt: z.string().min(1, 'Prompt is required'),
    answer: z.string().min(1, 'Answer is required').max(APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH, `Answer must be at most ${APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH} characters`),
  })).min(1, 'At least one prompt is required').max(3, 'Maximum 3 prompts allowed'),
```
With:
```typescript
  prompts: z.array(z.object({
    promptId: z.string().uuid('Invalid prompt ID'),
    sectionId: z.string().uuid('Invalid section ID'),
    answer: z.string().min(1, 'Answer is required').max(APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH, `Answer must be at most ${APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH} characters`),
  })).min(7, 'All 7 prompts are required').max(7, 'Exactly 7 prompts required'),
```

Also remove the legacy field validations:
```typescript
  // Legacy fields (optional for backward compatibility)
  promptAnswer: z.string().max(APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH, `Prompt answer must be at most ${APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH} characters`).optional(),
  selectedPrompt: z.string().optional(),
```

In `profileSchema`, remove:
```typescript
  approachPrompt: z
    .string()
    .max(APP.MAX_APPROACH_PROMPT_LENGTH, `Approach prompt must be at most ${APP.MAX_APPROACH_PROMPT_LENGTH} characters`)
    .optional(),
```

- [ ] **Step 3: Commit**

```bash
git add lib/utils/onboarding-mapper.ts lib/utils/validation.ts
git commit -m "feat: remove approach_prompt references, update prompts validation for 7 sections"
```

---

### Task 6: Onboarding — Per-Section Prompt Screen

**Files:**
- Create: `app/(auth)/onboarding/prompt-section.tsx`
- Modify: `app/(auth)/onboarding/_layout.tsx`

- [ ] **Step 1: Create the per-section prompt screen**

This screen reads the `sectionIndex` route param to know which of the 7 sections to display. It fetches prompt sections from the DB (cached by `usePromptSections`) and shows the prompts for the current section.

Create `app/(auth)/onboarding/prompt-section.tsx`:

```typescript
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

const TOTAL_STEPS = 14;

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
  const currentStep = 7 + sectionIdx;

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
```

- [ ] **Step 2: Update the onboarding layout**

Replace the contents of `app/(auth)/onboarding/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right'
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="basic-info" />
      <Stack.Screen name="intent" />
      <Stack.Screen name="select-home-gym" />
      <Stack.Screen name="fitness" />
      <Stack.Screen name="frequency" />
      <Stack.Screen name="gym-preferences" />
      <Stack.Screen name="prompt-section" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
```

- [ ] **Step 3: Update navigation from gym-preferences to first prompt section**

In `app/(auth)/onboarding/gym-preferences.tsx`, find where navigation goes to the next screen. Update it to navigate to `prompt-section` with `sectionIndex: '0'` instead of `prompts`.

Find the navigation call (likely `navigation.navigate('prompts')`) and replace with:
```typescript
(navigation as any).navigate('prompt-section', { sectionIndex: '0' });
```

- [ ] **Step 4: Update step numbers for screens after prompts**

Update `app/(auth)/onboarding/photos.tsx` — change `currentStep={8} totalSteps={9}` to `currentStep={14} totalSteps={14}`.

- [ ] **Step 5: Update all existing onboarding screens' totalSteps**

Update all screens that reference `totalSteps={9}` to `totalSteps={14}`:
- `app/(auth)/onboarding/basic-info.tsx`: `totalSteps={14}`
- `app/(auth)/onboarding/intent.tsx`: `totalSteps={14}`
- `app/(auth)/onboarding/select-home-gym.tsx`: `totalSteps={14}`
- `app/(auth)/onboarding/fitness.tsx`: `totalSteps={14}`
- `app/(auth)/onboarding/frequency.tsx`: `totalSteps={14}`
- `app/(auth)/onboarding/gym-preferences.tsx`: `totalSteps={14}`

- [ ] **Step 6: Delete the old prompts screen**

Delete `app/(auth)/onboarding/prompts.tsx` — it's fully replaced by `prompt-section.tsx`.

- [ ] **Step 7: Commit**

```bash
git add app/(auth)/onboarding/prompt-section.tsx app/(auth)/onboarding/_layout.tsx app/(auth)/onboarding/gym-preferences.tsx app/(auth)/onboarding/photos.tsx app/(auth)/onboarding/basic-info.tsx app/(auth)/onboarding/intent.tsx app/(auth)/onboarding/select-home-gym.tsx app/(auth)/onboarding/fitness.tsx app/(auth)/onboarding/frequency.tsx
git rm app/(auth)/onboarding/prompts.tsx
git commit -m "feat: replace single prompts screen with 7 per-section onboarding screens"
```

---

### Task 7: Onboarding Complete — Insert Profile Prompts

**Files:**
- Modify: `app/(auth)/onboarding/complete.tsx`

- [ ] **Step 1: Wire up prompt insertion on profile creation**

In `app/(auth)/onboarding/complete.tsx`, add the import at the top:
```typescript
import { insertProfilePrompts } from '@/lib/api/prompts';
```

In the `handleComplete` function, after the profile is inserted successfully (after line 97 `if (error) { throw error; }`), add:

```typescript
      // Insert profile prompt answers
      if (data.prompts.length > 0) {
        await insertProfilePrompts(user.id, data.prompts);
      }
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/onboarding/complete.tsx
git commit -m "feat: insert profile prompts on onboarding completion"
```

---

### Task 8: SwipeDeck — Replace Mock Prompts with Real Data

**Files:**
- Modify: `components/discover/SwipeDeck/index.tsx`
- Modify: `components/discover/SwipeDeck/ProfileDetailSheet.tsx`

- [ ] **Step 1: Update SwipeDeck to fetch real prompts**

In `components/discover/SwipeDeck/index.tsx`:

Add the import:
```typescript
import { useProfilePrompts } from '@/lib/api/prompts';
```

Inside the component, replace the `mockPrompts` useMemo (lines 444-460) with a hook call. Find the `topProfile` variable (it should be derived from the profiles array) and add:

```typescript
const { data: profilePrompts } = useProfilePrompts(topProfile?.id);

const prompts = useMemo(() => {
  if (!profilePrompts) return [];
  return profilePrompts.map((pp) => ({
    id: pp.id,
    title: pp.prompt_text.toUpperCase(),
    answer: pp.answer,
  }));
}, [profilePrompts]);
```

Delete the `mockPrompts` useMemo block entirely.

Update the `ProfileDetailSheet` usage (around line 849) — replace `mockPrompts={mockPrompts}` with `prompts={prompts}`.

Also update the `handlePromptPress` / `handleSendMessage` to use the prompt's `id` for engagement tracking if desired (optional for MVP).

- [ ] **Step 2: Update ProfileDetailSheet props**

In `components/discover/SwipeDeck/ProfileDetailSheet.tsx`:

Update the props interface:
```typescript
interface ProfileDetailSheetProps {
  profile: Profile | null;
  profileGym: { city?: string; [key: string]: any } | null | undefined;
  distance: number | null;
  prompts: Array<{ id: string; title: string; answer: string }>;
  onPromptPress: (title: string, answer: string) => void;
  bottomSheetRef: RefObject<BottomSheet | null>;
}
```

Update the destructured props — rename `mockPrompts` to `prompts`:
```typescript
export function ProfileDetailSheet({
  profile,
  profileGym,
  distance,
  prompts,
  onPromptPress,
  bottomSheetRef,
}: ProfileDetailSheetProps) {
```

Update the PromptsList usage:
```typescript
<PromptsList prompts={prompts} onPromptPress={onPromptPress} />
```

- [ ] **Step 3: Remove approach_prompt references from SwipeDeck**

In `components/discover/SwipeDeck/index.tsx`, find the "Approachable" pill that checks `topProfile.approach_prompt` (around lines 653-667) and remove it, since `approach_prompt` no longer exists.

- [ ] **Step 4: Commit**

```bash
git add components/discover/SwipeDeck/index.tsx components/discover/SwipeDeck/ProfileDetailSheet.tsx
git commit -m "feat: wire SwipeDeck and ProfileDetailSheet to real profile prompts"
```

---

### Task 9: Edit Profile — Add Prompts Section

**Files:**
- Modify: `app/(tabs)/profile/edit.tsx`

- [ ] **Step 1: Add prompt editing state and hooks**

In `app/(tabs)/profile/edit.tsx`, add imports:
```typescript
import { useProfilePrompts, usePromptSections, useUpsertProfilePrompt } from '@/lib/api/prompts';
import { FilteredTextarea } from '@/components/ui/FilteredTextarea';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { ProfilePromptWithDetails } from '@/types/onboarding';
```

Inside `EditProfileScreen`, add after existing hooks:
```typescript
const { data: profilePrompts, isLoading: promptsLoading } = useProfilePrompts(profile?.id);
const { data: promptSections } = usePromptSections();
const upsertPrompt = useUpsertProfilePrompt();

// Bottom sheet state for prompt editing
const [editingPrompt, setEditingPrompt] = useState<ProfilePromptWithDetails | null>(null);
const [editPromptId, setEditPromptId] = useState<string | null>(null);
const [editAnswer, setEditAnswer] = useState('');
const promptSheetRef = useRef<BottomSheet>(null);
const promptSheetSnapPoints = useMemo(() => ['85%'], []);
```

- [ ] **Step 2: Add prompt editing handlers**

```typescript
const handleOpenPromptEdit = useCallback((prompt: ProfilePromptWithDetails) => {
  setEditingPrompt(prompt);
  setEditPromptId(prompt.prompt_id);
  setEditAnswer(prompt.answer);
  promptSheetRef.current?.snapToIndex(0);
}, []);

const handleSavePrompt = useCallback(async () => {
  if (!editingPrompt || !editPromptId || !editAnswer.trim()) return;
  
  const isSwappedPrompt = editPromptId !== editingPrompt.prompt_id;
  
  try {
    await upsertPrompt.mutateAsync({
      promptId: editPromptId,
      sectionId: editingPrompt.section_id,
      answer: editAnswer.trim(),
      resetEngagement: isSwappedPrompt,
    });
    promptSheetRef.current?.close();
    setEditingPrompt(null);
  } catch (err) {
    console.error('[EditProfile] Failed to update prompt:', err);
    toast({
      preset: 'error',
      title: 'Failed to update prompt',
      message: err instanceof Error ? err.message : 'Please try again.',
    });
  }
}, [editingPrompt, editPromptId, editAnswer, upsertPrompt]);
```

- [ ] **Step 3: Add the prompts section UI**

In the ScrollView, after the Photos section and before `<View style={{ height: spacing[12] }} />`, add:

```typescript
          {/* Prompts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prompts</Text>
            {promptsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : profilePrompts && profilePrompts.length > 0 ? (
              <View style={{ gap: spacing[4] }}>
                {profilePrompts.map((pp) => (
                  <Pressable
                    key={pp.id}
                    onPress={() => handleOpenPromptEdit(pp)}
                    style={styles.promptEditCard}
                  >
                    <Text style={styles.promptEditSection}>{pp.section_name}</Text>
                    <Text style={styles.promptEditTitle} numberOfLines={2}>
                      {pp.prompt_text}
                    </Text>
                    <Text style={styles.promptEditAnswer} numberOfLines={2}>
                      {pp.answer}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.promptEditEmpty}>No prompts yet</Text>
            )}
          </View>
```

- [ ] **Step 4: Add the prompt editing bottom sheet**

Before the closing `</SafeAreaView>`, add the bottom sheet:

```typescript
      {/* Prompt Edit Bottom Sheet */}
      <BottomSheet
        ref={promptSheetRef}
        index={-1}
        snapPoints={promptSheetSnapPoints}
        backdropComponent={(props: any) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
        )}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.muted }}
        enablePanDownToClose
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <View style={{ padding: spacing[6], gap: spacing[4], paddingBottom: spacing[28] }}>
            {editingPrompt && promptSections && (() => {
              const section = promptSections.find((s) => s.id === editingPrompt.section_id);
              if (!section) return null;
              return (
                <>
                  <Text style={styles.promptSheetTitle}>{section.name}</Text>
                  <Text style={styles.promptSheetSubtitle}>{section.subtitle}</Text>
                  <View style={{ gap: spacing[2] }}>
                    {section.prompts.map((p) => {
                      const isSelected = editPromptId === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            setEditPromptId(p.id);
                            if (p.id !== editingPrompt.prompt_id) {
                              setEditAnswer('');
                            }
                          }}
                          style={[
                            styles.promptOption,
                            isSelected && styles.promptOptionSelected,
                          ]}
                        >
                          <Text style={[
                            styles.promptOptionText,
                            isSelected && styles.promptOptionTextSelected,
                          ]}>
                            {p.prompt_text}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {editPromptId && (
                    <FilteredTextarea
                      placeholder="Your answer..."
                      value={editAnswer}
                      onChangeText={setEditAnswer}
                      maxLength={APP.MAX_ONBOARDING_PROMPT_ANSWER_LENGTH}
                      showCharCount
                    />
                  )}
                  <Button
                    onPress={handleSavePrompt}
                    disabled={!editPromptId || !editAnswer.trim() || upsertPrompt.isPending}
                  >
                    {upsertPrompt.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </>
              );
            })()}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
```

- [ ] **Step 5: Add styles for prompt editing**

Add to the StyleSheet:
```typescript
  promptEditCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[1],
  },
  promptEditSection: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textTransform: 'uppercase' as const,
  },
  promptEditTitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  promptEditAnswer: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  promptEditEmpty: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center' as const,
    paddingVertical: spacing[4],
  },
  promptSheetTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  promptSheetSubtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
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
```

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/profile/edit.tsx
git commit -m "feat: add prompt editing to edit profile screen"
```

---

### Task 10: Cleanup — Remove Legacy Code

**Files:**
- Modify: `lib/api/profiles.ts`
- Modify: `theme/tokens.ts`

- [ ] **Step 1: Remove approach_prompt filtering from profiles API**

In `lib/api/profiles.ts`, remove lines 100-102:
```typescript
      if (typeof filteredUpdates.approach_prompt === 'string') {
        filteredUpdates.approach_prompt = filterBadWords(filteredUpdates.approach_prompt);
      }
```

- [ ] **Step 2: Remove MAX_APPROACH_PROMPT_LENGTH from tokens**

In `theme/tokens.ts`, remove:
```typescript
  MAX_APPROACH_PROMPT_LENGTH: 100,
```

- [ ] **Step 3: Commit**

```bash
git add lib/api/profiles.ts theme/tokens.ts
git commit -m "chore: remove approach_prompt legacy references"
```

---

### Task 11: Update Memory

**Files:**
- Modify: `/Users/chrischidgey/.claude/projects/-Users-chrischidgey-dev-gymcrush/memory/project_prompts_decision.md`

- [ ] **Step 1: Update the memory file**

The existing memory about "SwipeDeck mockPrompts pending client decision: DB vs hardcoded" is now resolved. Update the memory to reflect the decision:

Update `project_prompts_decision.md` to:
```markdown
---
name: Prompts system decision
description: Profile prompts moved from hardcoded to DB-managed with 7 sections × 10 prompts
type: project
---

Prompts moved to DB. 3 new tables: prompt_sections, prompts, profile_prompts. 7 sections (Who I Am, How I Think, What I'm Into, Where I'm Headed, How I Love, Let's Have Fun, Sweat Life), 10 prompts each. Users answer one per section. engagement_count column on profile_prompts for future ranked display.

**Why:** Client wanted manageable prompt catalog, not hardcoded. Sweat Life displayed last to anchor gym focus.

**How to apply:** All prompt data comes from DB now. FITNESS_PROMPTS and approach_prompt are gone.
```

- [ ] **Step 2: Commit**

No git commit needed for memory files.
