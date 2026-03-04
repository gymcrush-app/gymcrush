import type { FitnessDiscipline } from '@/types/onboarding';

export type WorkoutTypeOption = { value: FitnessDiscipline; label: string };

export const WORKOUT_TYPE_OPTIONS: WorkoutTypeOption[] = [
  { value: 'bodybuilding', label: 'Bodybuilding' },
  { value: 'powerlifting', label: 'Powerlifting' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'olympic', label: 'Olympic' },
  { value: 'functional', label: 'Functional' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'running', label: 'Running' },
  { value: 'sports', label: 'Sports' },
  { value: 'general', label: 'General' },
];

export const FITNESS_DISCIPLINES: FitnessDiscipline[] = [
  'bodybuilding',
  'powerlifting',
  'crossfit',
  'olympic',
  'functional',
  'yoga',
  'running',
  'sports',
  'general',
];
