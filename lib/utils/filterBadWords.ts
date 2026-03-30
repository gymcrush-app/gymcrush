/**
 * Profanity filter for public-facing text.
 * Masks bad words with length-only asterisks (e.g. "fuck" → "****").
 * Safe words like "face" are allowlisted so they are not masked.
 */

import { Filter } from 'bad-words';

const filter = new Filter({ placeHolder: '*' });

// Allowlist: words that should not be masked (e.g. "face" when "fuck" is filtered)
filter.removeWords('face');

/**
 * Replace bad words with one asterisk per character (length-only masking).
 * Safe for null/undefined; returns empty string for empty input.
 */
export function filterBadWords(text: string | null | undefined): string {
  if (text == null || text === '') return '';
  try {
    return filter.clean(text);
  } catch {
    return text;
  }
}

/**
 * Returns true if the text contains words that will be censored.
 * Use to show the censored preview only when relevant.
 */
export function containsBadWords(text: string | null | undefined): boolean {
  if (text == null || text === '') return false;
  try {
    return filter.clean(text) !== text;
  } catch {
    return false;
  }
}
