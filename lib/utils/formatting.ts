/**
 * Formatting Utilities
 * 
 * Functions to format data for display in the UI.
 */

import type { Intent, FitnessDiscipline } from '@/types/onboarding';

/**
 * Format Intent value to display label
 */
export function formatIntent(intent: Intent): string {
  const intentLabels: Record<Intent, string> = {
    meet_trainer: 'Looking for trainer',
    casual: 'Casual',
    longterm: 'Long-term',
    open: 'Open',
  };
  
  return intentLabels[intent] || intent;
}

/**
 * Format FitnessDiscipline value to display label
 */
export function formatFitnessDiscipline(discipline: FitnessDiscipline): string {
  // Capitalize first letter and handle special cases
  const labels: Record<FitnessDiscipline, string> = {
    bodybuilding: 'Bodybuilding',
    powerlifting: 'Powerlifting',
    crossfit: 'CrossFit',
    olympic: 'Olympic Lifting',
    functional: 'Functional',
    yoga: 'Yoga',
    running: 'Running',
    sports: 'Sports',
    general: 'General',
  };
  
  return labels[discipline] || discipline.charAt(0).toUpperCase() + discipline.slice(1);
}

/**
 * Format array of intents for display
 */
export function formatIntents(intents: Intent[]): string {
  if (intents.length === 0) return '—';
  return intents.map(formatIntent).join(', ');
}

/**
 * Format array of fitness disciplines for display
 */
export function formatFitnessDisciplines(disciplines: FitnessDiscipline[]): string {
  if (disciplines.length === 0) return '—';
  return disciplines.map(formatFitnessDiscipline).join(', ');
}

/**
 * Format relative time (e.g., "2m ago", "1h ago", "3d ago")
 */
export function formatRelativeTime(date: Date | string): string {
  // Dynamic import to avoid requiring date-fns if not used
  // For now, return a simple implementation
  // In production, use: import { formatDistanceToNow } from 'date-fns';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w`;
  
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo`;
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
