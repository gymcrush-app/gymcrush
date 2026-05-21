import type { BraceletStatus, Visibility } from '@/types';

/**
 * Explicit column list for client-bound profile reads. `last_location` and
 * `last_location_updated_at` are intentionally omitted — column-level SELECT
 * was revoked in migration 00042, so `select('*')` against `profiles` 403s.
 * Keep this in sync when columns are added to the `profiles` table.
 */
export const PROFILE_COLUMNS =
  'id, display_name, age, gender, bio, fitness_disciplines, photo_urls, ' +
  'home_gym_id, is_visible, is_onboarded, discovery_preferences, ' +
  'created_at, updated_at, height, occupation, last_gem_given_at, ' +
  'gems_received_count, religion, alcohol, smoking, marijuana, has_kids, ethnicity';

export interface VisibilityOption {
  value: Visibility;
  label: string;
  description: string;
}

export const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: 'visible',
    label: 'Visible',
    description: 'Others can see and match with you',
  },
  {
    value: 'paused',
    label: 'Paused',
    description: 'Hidden from new people, but keep matches',
  },
  {
    value: 'invisible',
    label: 'Invisible',
    description: 'Completely hidden from everyone',
  },
];

export interface BraceletOption {
  value: BraceletStatus;
  label: string;
}

export const BRACELET_OPTIONS: BraceletOption[] = [
  { value: 'wearing', label: 'At the gym' },
  { value: 'not_wearing', label: 'Not at gym' },
  { value: 'no_bracelet', label: 'No bracelet' },
];
