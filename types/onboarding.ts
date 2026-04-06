/**
 * Onboarding Types - Aligned with Lovable Prototype
 *
 * This file contains the onboarding-specific types that match the Lovable prototype.
 * The onboarding flow maps to these steps:
 *
 * 1. account (index.tsx) - Full name, date of birth, email, password
 * 2. intent (intent.tsx) - What are you looking for? (meet_trainer, casual, longterm, open)
 * 3. discipline (discipline.tsx) - Fitness disciplines selection
 * 4. frequency (frequency.tsx) - Training frequency (1-2, 3-4, 5+)
 * 5. gymPreferences (gym-preferences.tsx) - Gym selection using Google Places
 * 6. profile (profile.tsx) - Photos, fitness lifestyle, approach preference, prompt
 * 7. complete - Final step, create profile
 */

export type OnboardingStep =
  | "account"
  | "intent"
  | "discipline"
  | "frequency"
  | "gymPreferences"
  | "profile"
  | "complete"

export type Intent = "shortterm" | "longterm" | "open"

export type FitnessDiscipline =
  | "bodybuilding"
  | "powerlifting"
  | "crossfit"
  | "olympic"
  | "functional"
  | "yoga"
  | "running"
  | "sports"
  | "general"

export type TrainingFrequency = "1-2" | "3-4" | "5+"

/** Preferred time of day for gym (stored in discovery_preferences) */
export type PreferredTimeOfDay =
  | "morning"
  | "afternoon"
  | "evening"
  | "when_i_can"

export type FitnessLifestyle = "gym_life" | "balanced" | "starting" | "on_off"

export type ApproachPreference = "yes" | "sometimes" | "no"

export type Religion = 'Atheist' | 'Jewish' | 'Muslim' | 'Christian' | 'Catholic' | 'Buddhist' | 'Hindu' | 'Sikh' | 'Spiritual' | 'Other';

export type YesNoSometimes = 'Yes' | 'No' | 'Sometimes';

export type YesNo = 'Yes' | 'No';

export interface GooglePlaceGym {
  place_id: string
  name: string
  formatted_address: string
  location?: { lat: number; lng: number }
}

export interface PromptAnswer {
  promptId: string
  sectionId: string
  answer: string
}

export interface OnboardingData {
  fullName: string
  dateOfBirth: Date | null
  gender: "male" | "female" | null
  height: string | null // Format: "5'10""
  occupation: string | null
  religion: Religion | null;
  alcohol: YesNoSometimes | null;
  smoking: YesNoSometimes | null;
  marijuana: YesNoSometimes | null;
  hasKids: YesNo | null;
  email: string
  password: string
  intents: Intent[]
  disciplines: FitnessDiscipline[]
  trainingFrequency: TrainingFrequency | null
  fitnessLifestyle: FitnessLifestyle | null
  approachPreference: ApproachPreference | null
  showStatusPublicly: boolean
  photos: string[]
  prompts: PromptAnswer[] // 7 prompts, one per section
  selectedGyms: string[]
  interestedInGender: "men" | "women" | "everyone" | null
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  fullName: "",
  dateOfBirth: null,
  gender: null,
  height: null,
  occupation: null,
  religion: null,
  alcohol: null,
  smoking: null,
  marijuana: null,
  hasKids: null,
  email: "",
  password: "",
  intents: [],
  disciplines: [],
  trainingFrequency: null,
  fitnessLifestyle: null,
  approachPreference: null,
  showStatusPublicly: true,
  photos: [],
  prompts: [],
  selectedGyms: [],
  interestedInGender: null,
}

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
