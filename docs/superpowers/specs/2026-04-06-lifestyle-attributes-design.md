# Lifestyle Attributes — Design Spec

## Overview

Add 5 new user profile attributes (religion, alcohol, smoking, marijuana, has_kids) with onboarding collection, profile display, and edit profile support.

## Database

New migration: `00030_add_lifestyle_attributes.sql`

```sql
ALTER TABLE profiles
  ADD COLUMN religion TEXT CHECK (religion IN ('Atheist','Jewish','Muslim','Christian','Catholic','Buddhist','Hindu','Sikh','Spiritual','Other')),
  ADD COLUMN alcohol TEXT CHECK (alcohol IN ('Yes','No','Sometimes')),
  ADD COLUMN smoking TEXT CHECK (smoking IN ('Yes','No','Sometimes')),
  ADD COLUMN marijuana TEXT CHECK (marijuana IN ('Yes','No','Sometimes')),
  ADD COLUMN has_kids TEXT CHECK (has_kids IN ('Yes','No'));
```

All columns nullable at the DB level (existing users won't have values). New onboarding enforces them as required via client-side validation.

After applying the migration, regenerate TypeScript types with `supabase gen types`.

## Onboarding

Three new screens inserted after `basic-info` and before `intent`:

### Screen 1: `religion.tsx`
- Header: "What's your faith?"
- Single-select button list with 10 options: Atheist, Jewish, Muslim, Christian, Catholic, Buddhist, Hindu, Sikh, Spiritual, Other
- Same visual style as gender selection in basic-info (pill/chip buttons, highlight on selection)
- Must select one to proceed

### Screen 2: `vices.tsx`
- Header: "Your lifestyle"
- Three labeled sections on one screen:
  - **Alcohol** — 3 buttons: Yes / No / Sometimes
  - **Cigarettes** — 3 buttons: Yes / No / Sometimes
  - **Marijuana** — 3 buttons: Yes / No / Sometimes
- Same button style as religion screen
- All three must be answered to proceed

### Screen 3: `kids.tsx`
- Header: "Do you have kids?"
- 2 buttons: Yes / No
- Must select one to proceed

### Type Changes

`types/onboarding.ts` — add to `OnboardingData`:
```typescript
religion: 'Atheist' | 'Jewish' | 'Muslim' | 'Christian' | 'Catholic' | 'Buddhist' | 'Hindu' | 'Sikh' | 'Spiritual' | 'Other' | null;
alcohol: 'Yes' | 'No' | 'Sometimes' | null;
smoking: 'Yes' | 'No' | 'Sometimes' | null;
marijuana: 'Yes' | 'No' | 'Sometimes' | null;
hasKids: 'Yes' | 'No' | null;
```

### Mapper Changes

`lib/utils/onboarding-mapper.ts` — pass through to profile insert:
```typescript
religion: onboardingData.religion ?? null,
alcohol: onboardingData.alcohol ?? null,
smoking: onboardingData.smoking ?? null,
marijuana: onboardingData.marijuana ?? null,
has_kids: onboardingData.hasKids ?? null,
```

### Navigation

Update `onboarding/_layout.tsx` to include the 3 new screens in the stack. Navigation order:
1. basic-info → religion → vices → kids → intent → (rest unchanged)

## Profile Display

### New Component: `ProfileLifestyleBox`

Location: `components/profile/ProfileLifestyleBox.tsx`

Same card styling as `ProfileInfoBox`. Layout:

```
┌──────────┬──────────┬──────────┐
│ Religion │ Alcohol  │   Cigs   │
│ Catholic │   Yes    │    No    │
├──────────┴────┬─────┴──────────┤
│      Pot      │      Kids      │
│   Sometimes   │       No       │
└───────────────┴────────────────┘
```

- Top row: 3 equal columns
- Bottom row: 2 equal columns
- Labels in muted/small text above values
- Religion shows the faith name; others show Yes/No/Sometimes
- Dash ("—") for any null values

### Integration

`components/profile/ProfileView.tsx` — render `ProfileLifestyleBox` directly below the existing `ProfileInfoBox`. Props:
```typescript
interface ProfileLifestyleBoxProps {
  religion: string | null;
  alcohol: string | null;
  smoking: string | null;
  marijuana: string | null;
  hasKids: string | null;
}
```

Also add to `OtherUserProfileContent.tsx` and `ProfileDetailSheet.tsx` wherever `ProfileInfoBox` is rendered.

## Edit Profile

Add a **"Lifestyle"** section to `app/(tabs)/profile/edit.tsx`, placed after the existing basics section (height/occupation area).

Fields use the existing `Select` component pattern:
- **Religion** — Select dropdown with 10 options
- **Alcohol** — Select dropdown: Yes / No / Sometimes
- **Cigarettes** — Select dropdown: Yes / No / Sometimes
- **Marijuana** — Select dropdown: Yes / No / Sometimes
- **Kids** — Select dropdown: Yes / No

Include in the existing auto-save debounce logic — changes to any lifestyle field trigger the same 700ms debounce save as other profile fields.

## Seed Scripts

Update seed scripts (`scripts/seed-profiles.ts`, `scripts/seed-female-users-with-likes.ts`, `scripts/reset-and-seed.ts`) to include random lifestyle attribute values for seeded profiles.
