/**
 * Shared App Types
 * 
 * Common types used throughout the GymCrush app.
 */

import type { Database } from './database';

// Database types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Gym = Database['public']['Tables']['gyms']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];

// Onboarding types (re-exported from onboarding.ts)
export type {
  ApproachPreference, FITNESS_PROMPTS, FitnessDiscipline, FitnessLifestyle, GooglePlaceGym, INITIAL_ONBOARDING_DATA, Intent, OnboardingData, OnboardingStep, TrainingFrequency
} from './onboarding';

// Legacy types (for backward compatibility)
export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

export type ReportReason = 'inappropriate' | 'fake' | 'harassment' | 'other';

export type SwipeAction = 'like' | 'pass' | 'crush';

export type Visibility = 'visible' | 'paused' | 'invisible';
export type BraceletStatus = 'wearing' | 'not_wearing' | 'no_bracelet';

export interface DiscoveryPreferences {
  minAge?: number;
  maxAge?: number;
  genders: Gender[];
}

export interface MatchWithProfile extends Match {
  otherUser: Profile;
  lastMessage?: Message;
  unreadCount?: number;
}
