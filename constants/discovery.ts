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

export const MIN_DISTANCE_MILES = 2;
export const MAX_DISTANCE_MILES = 100;
export const DEFAULT_DISTANCE_MILES = 30;
