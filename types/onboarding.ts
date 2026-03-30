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

export interface GooglePlaceGym {
  place_id: string
  name: string
  formatted_address: string
  location?: { lat: number; lng: number }
}

export interface PromptAnswer {
  prompt: string
  answer: string
}

export interface OnboardingData {
  fullName: string
  dateOfBirth: Date | null
  gender: "male" | "female" | null
  height: string | null // Format: "5'10""
  occupation: string | null
  email: string
  password: string
  intents: Intent[]
  disciplines: FitnessDiscipline[]
  trainingFrequency: TrainingFrequency | null
  fitnessLifestyle: FitnessLifestyle | null
  approachPreference: ApproachPreference | null
  showStatusPublicly: boolean
  photos: string[]
  prompts: PromptAnswer[] // Array of up to 3 prompts
  selectedGyms: string[]
  interestedInGender: "men" | "women" | "everyone" | null
  // Legacy fields for backward compatibility (will be removed)
  promptAnswer: string
  selectedPrompt: string
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  fullName: "",
  dateOfBirth: null,
  gender: null,
  height: null,
  occupation: null,
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
  // Legacy fields
  promptAnswer: "",
  selectedPrompt: "",
}

export const FITNESS_PROMPTS = [
  "My gym hot take is...",
  "The way to my heart is through...",
  "My ideal post-workout meal is...",
  "You'll find me at the gym when...",
  "My fitness journey started because...",
  "The exercise I love to hate is...",
  "My gym playlist always includes...",
  "After leg day, I'm usually...",
] as const
