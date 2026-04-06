# Profile Layout Reorder + Prompt Onboarding Redesign — Design Spec

## Overview

Two related changes: (1) reorder the profile view to interleave prompts with info boxes, and (2) reduce prompt onboarding from 7 forced-section screens to 3 free-choice screens where users pick any theme + question.

## 1. Profile View Layout Reorder

### Current Layout (SwipeDeck, OtherUserProfileContent)

1. Top prompt (most engaged)
2. ProfileInfoBox + ProfileLifestyleBox + Bio (bundled in ProfileDetailContent)
3. Batch of ~3 prompts
4. Duplicate ProfileInfoBox (same data repeated)
5. Batch of ~3 more prompts

### New Layout

1. **Top prompt** (most engaged, highlighted)
2. **ProfileInfoBox** (Height / Occupation / Intent / City)
3. **AboutSection** (bio — "When I'm Not At The Gym")
4. **Prompt 2** (highlighted)
5. **ProfileLifestyleBox** (Religion / Alcohol / Cigs / Pot / Kids)
6. **Prompt 3** (highlighted)

### Implementation

**Stop using `ProfileDetailContent`** as a wrapper in SwipeDeck and OtherUserProfileContent. Instead, render `ProfileInfoBox`, `AboutSection`, `ProfileLifestyleBox`, and individual `PromptItem` components directly in the desired order.

**Replace batch splitting logic.** Currently prompts are split into `topPrompt`, `promptBatch1`, `promptBatch2`. With only 3 prompts, change to `prompt1` (top/most engaged), `prompt2`, `prompt3`. The splitting logic in both SwipeDeck and OtherUserProfileContent should produce 3 individual prompts rather than batches.

**ProfileDetailSheet** (bottom sheet in SwipeDeck): Same new layout — individual components in order rather than `ProfileDetailContent`.

**ProfileView** (self profile tab): Same reorder. Currently uses `ProfileInfoBox` + `ProfileLifestyleBox` + `AboutSection` inline. Reorder to match: InfoBox → Bio → LifestyleBox, but no prompts are displayed on self profile (prompts are in edit profile). Keep existing self-profile layout, just ensure info boxes aren't duplicated.

**FitnessBadges:** Currently rendered inside `ProfileDetailContent` children. Move to render after the last prompt (prompt 3) or at the bottom of the profile content.

## 2. Prompt Onboarding Redesign

### Current Flow

7 screens (`prompt-section.tsx` with `sectionIndex` 0-6), each locked to a specific prompt section. User picks 1 question from ~10 in that section, writes an answer. Total: 7 prompts.

### New Flow

3 screens (`prompt-section.tsx` with `sectionIndex` 0-2), each allowing free choice of any theme. User flow per screen:

1. **Pick a theme** — all 7 section names shown as selectable cards/pills. Tapping one loads its questions.
2. **Pick a question** — questions from the selected theme appear, minus any questions already chosen on previous screens. Tapping one selects it.
3. **Write answer** — textarea appears, user types their answer.
4. **Continue** — saves the prompt answer, navigates to next prompt screen (or photos on screen 3).

### Filtering Rules

- **Themes are always available.** A user can pick the same theme on all 3 screens.
- **Previously chosen questions are hidden.** If a user picked "The hobby I can talk about for hours..." on screen 1, that question won't appear on screens 2 and 3, even if the same theme is selected.
- **If a theme has 0 remaining questions** (all 10 picked — impossible with only 3 screens, but for safety), disable that theme.

### Screen Layout

```
┌─────────────────────────────────┐
│     Pick a theme & question     │
│   Answer one of three prompts   │
│                                 │
│  [Theme 1] [Theme 2] [Theme 3] │
│  [Theme 4] [Theme 5] [Theme 6] │
│  [Theme 7]                      │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Question option 1           ││
│  ├─────────────────────────────┤│
│  │ Question option 2 (sel.)    ││
│  ├─────────────────────────────┤│
│  │ Question option 3           ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ Your answer...              ││
│  │                             ││
│  └─────────────────────────────┘│
│                                 │
│         [ Continue ]            │
└─────────────────────────────────┘
```

Themes displayed as flex-wrap pill buttons (same style as religion onboarding screen). Selected theme is highlighted. Questions shown as a vertical list below.

### Navigation Changes

- `prompt-section.tsx` navigates `sectionIndex` 0 → 1 → 2 → photos (was 0-6)
- On screen 3 (`sectionIndex === 2`), button says "Continue" and navigates to photos

### Step Number Updates

Total steps change from 17 to 13:

| Step | Screen |
|------|--------|
| 1 | basic-info |
| 2 | religion |
| 3 | vices |
| 4 | kids |
| 5 | intent |
| 6 | select-home-gym |
| 7 | fitness |
| 8 | frequency |
| 9 | gym-preferences |
| 10 | prompt-section (slot 0) |
| 11 | prompt-section (slot 1) |
| 12 | prompt-section (slot 2) |
| 13 | photos |

All `totalSteps` references update from 17 to 13. `currentStep` values:
- basic-info: 1
- religion: 2
- vices: 3
- kids: 4
- intent: 5
- select-home-gym: 6
- fitness: 7
- frequency: 8
- gym-preferences: 9
- prompt-section: `10 + sectionIdx`
- photos: 13

### OnboardingData

No changes to the `prompts: PromptAnswer[]` field — it still stores `{ promptId, sectionId, answer }` entries. Just 3 entries instead of 7.

### Complete Screen (onboarding completion)

`complete.tsx` calls `insertProfilePrompts` with `data.prompts`. No changes needed — it already handles an array of any length.

## Files Affected

### Profile layout reorder:
- `components/discover/SwipeDeck/index.tsx` — reorder, replace batches with individual prompts
- `components/profile/OtherUserProfileContent.tsx` — same reorder
- `components/discover/SwipeDeck/ProfileDetailSheet.tsx` — same reorder
- `components/profile/ProfileDetailContent.tsx` — may be simplified or removed if no longer used

### Prompt onboarding:
- `app/(auth)/onboarding/prompt-section.tsx` — rewrite to support theme selection + free question choice + filtering

### Step numbers:
- All onboarding screens: update `totalSteps` from 17 to 13 and adjust `currentStep` values
