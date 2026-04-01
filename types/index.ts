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
  ApproachPreference, FitnessDiscipline, FitnessLifestyle, GooglePlaceGym, Intent, OnboardingData, OnboardingStep, PromptAnswer, PromptSectionWithPrompts, ProfilePromptWithDetails, TrainingFrequency
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

/** Profile with engagement metrics from Gym Gems RPC */
export interface ProfileWithScore extends Profile {
  engagement_score: number;
  likes_received: number;
  crush_received: number;
  matches_count: number;
  first_messages_received: number;
}
