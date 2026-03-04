import type { BraceletStatus, Visibility } from '@/types';

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
