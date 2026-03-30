/**
 * Discovery / feed constants: distance bounds, default preferences, gender options.
 */

export type DiscoveryGenderOptionValue = 'men' | 'women';

export interface DiscoveryGenderOption {
  value: DiscoveryGenderOptionValue;
  label: string;
}

export const GENDER_OPTIONS: DiscoveryGenderOption[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
];

export type DiscoveryGenderOptionWithEveryoneValue = 'men' | 'women' | 'everyone';

export interface DiscoveryGenderOptionWithEveryone {
  value: DiscoveryGenderOptionWithEveryoneValue;
  label: string;
}

export const GENDER_OPTIONS_WITH_EVERYONE: DiscoveryGenderOptionWithEveryone[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
];

export const MIN_DISTANCE_MILES = 2;
export const MAX_DISTANCE_MILES = 100;
export const DEFAULT_DISTANCE_MILES = 30;

/** Display labels for training frequency on discover cards */
export const TRAINING_FREQUENCY_LABELS: Record<string, string> = {
  '1-2': '1-2 days/w',
  '3-4': '3-4 days/w',
  '5+': '5-6 days/w',
  gym_rat: 'Gym Rat',
};

/** Display labels for preferred time of day on discover cards */
export const TIME_OF_DAY_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  when_i_can: 'When I Can',
};
