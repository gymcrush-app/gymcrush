import type {
  ApproachPreference,
  FitnessLifestyle,
  Intent,
  TrainingFrequency,
} from '@/types/onboarding';

export interface MonthOption {
  value: string;
  label: string;
}

export const MONTH_OPTIONS: MonthOption[] = [
  { value: '0', label: 'Jan' },
  { value: '1', label: 'Feb' },
  { value: '2', label: 'Mar' },
  { value: '3', label: 'Apr' },
  { value: '4', label: 'May' },
  { value: '5', label: 'Jun' },
  { value: '6', label: 'Jul' },
  { value: '7', label: 'Aug' },
  { value: '8', label: 'Sep' },
  { value: '9', label: 'Oct' },
  { value: '10', label: 'Nov' },
  { value: '11', label: 'Dec' },
];

export interface IntentOption {
  value: Intent;
  label: string;
  emoji: string;
  description: string;
}

export const INTENT_OPTIONS: IntentOption[] = [
  {
    value: 'meet_trainer',
    label: 'Meet someone who trains',
    emoji: '💪',
    description: 'Find someone who shares your fitness lifestyle',
  },
  {
    value: 'casual',
    label: 'Casual connection',
    emoji: '✨',
    description: 'Keep things light and fun',
  },
  {
    value: 'longterm',
    label: 'Long-term relationship',
    emoji: '💕',
    description: 'Looking for something serious',
  },
  {
    value: 'open',
    label: 'Open to seeing what happens',
    emoji: '🌟',
    description: "Let's see where this goes",
  },
];

export interface FrequencyOption {
  value: TrainingFrequency;
  label: string;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { value: '1-2', label: '1-2x / week' },
  { value: '3-4', label: '3-4x / week' },
  { value: '5+', label: '5+ / week' },
];

export interface LifestyleOption {
  value: FitnessLifestyle;
  label: string;
  description: string;
}

export const LIFESTYLE_OPTIONS: LifestyleOption[] = [
  {
    value: 'gym_life',
    label: 'Gym is life',
    description: 'Training is my priority',
  },
  {
    value: 'balanced',
    label: 'Consistent but balanced',
    description: 'Regular training, but life comes first',
  },
  {
    value: 'starting',
    label: 'Just getting started',
    description: 'Building my fitness routine',
  },
  {
    value: 'on_off',
    label: 'On & off',
    description: 'I go through phases',
  },
];

export interface ApproachOption {
  value: ApproachPreference;
  label: string;
  description: string;
}

export const APPROACH_OPTIONS: ApproachOption[] = [
  {
    value: 'yes',
    label: 'Yes',
    description: "I'm open to meeting people at the gym",
  },
  {
    value: 'sometimes',
    label: 'Sometimes',
    description: 'Depends on my mood',
  },
  {
    value: 'no',
    label: 'Prefer not',
    description: 'I like to focus on my workout',
  },
];
