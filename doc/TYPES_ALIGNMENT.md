# Types Alignment with Lovable Prototype

This document explains how the GymCrush types align with the Lovable prototype.

## Onboarding Flow

### Lovable Steps → File Structure

| Lovable Step | File | Description |
|-------------|------|-------------|
| `account` | `app/(auth)/onboarding/index.tsx` | Full name, date of birth, email, password |
| `intent` | `app/(auth)/onboarding/intent.tsx` | What are you looking for? (meet_trainer, casual, longterm, open) |
| `discipline` | `app/(auth)/onboarding/discipline.tsx` | Fitness disciplines selection |
| `frequency` | `app/(auth)/onboarding/frequency.tsx` | Training frequency (1-2, 3-4, 5+) |
| `gymPreferences` | `app/(auth)/onboarding/gym-preferences.tsx` | Gym selection using Google Places |
| `profile` | `app/(auth)/onboarding/profile.tsx` | Photos, fitness lifestyle, approach preference, prompt |
| `complete` | (auto) | Create profile in database |

**Note:** The current file structure uses different names (`photos`, `fitness`, `gym-select`, etc.) but should be updated to match Lovable steps, or the routes should map to the Lovable step names.

## Type Mappings

### FitnessDiscipline

**Lovable:**
- `bodybuilding` | `powerlifting` | `crossfit` | `olympic` | `functional` | `yoga` | `running` | `sports` | `general`

**Previous Implementation:**
- `weightlifting` | `cardio` | `yoga` | `pilates` | `crossfit` | `calisthenics` | `running` | `cycling` | `swimming` | `martial-arts` | `dance` | `other`

**Status:** ✅ Updated to match Lovable

### OnboardingData Structure

The `OnboardingData` type from Lovable includes:
- `fullName` → maps to `display_name` in DB
- `dateOfBirth` → used to calculate `age` for DB
- `email`, `password` → handled by Supabase Auth
- `intents` → stored in `discovery_preferences` JSONB
- `disciplines` → maps to `fitness_disciplines` array
- `trainingFrequency` → stored in `discovery_preferences` JSONB
- `fitnessLifestyle` → stored in `discovery_preferences` JSONB
- `approachPreference` → stored in `discovery_preferences` JSONB, influences `approach_prompt`
- `showStatusPublicly` → maps to `is_visible`
- `photos` → maps to `photo_urls` array
- `promptAnswer` + `selectedPrompt` → combined into `approach_prompt`
- `selectedGyms` → first gym becomes `home_gym_id` (DB supports single gym)

### Database Schema vs Lovable Structure

The database schema is more normalized than the Lovable `OnboardingData` structure. Use `lib/utils/onboarding-mapper.ts` to convert between formats:

- **Saving:** `mapOnboardingDataToProfile()` converts Lovable format → DB format
- **Loading:** `mapProfileToOnboardingData()` converts DB format → Lovable format (partial)

## New Types Added

All types from Lovable have been added to `types/index.ts`:

- ✅ `OnboardingStep`
- ✅ `Intent`
- ✅ `FitnessDiscipline` (updated)
- ✅ `TrainingFrequency`
- ✅ `FitnessLifestyle`
- ✅ `ApproachPreference`
- ✅ `GooglePlaceGym`
- ✅ `OnboardingData`
- ✅ `INITIAL_ONBOARDING_DATA`
- ✅ `FITNESS_PROMPTS`

## Validation Schema

Added `onboardingSchema` to `lib/utils/validation.ts` that validates the Lovable `OnboardingData` structure.

## Next Steps

1. Update onboarding route files to match Lovable step names (or create route mapping)
2. Implement Google Places API integration for gym search (replace Supabase gyms table or use both)
3. Update components to use new FitnessDiscipline values
4. Implement all onboarding steps using OnboardingData structure
