/**
 * Sentry — error tracking. Call initSentry() from app/_layout.tsx on app start.
 * Uses EXPO_PUBLIC_SENTRY_DSN. Add release tracking and full config as needed for production.
 */

import * as Sentry from '@sentry/react-native';

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    // Add additional Sentry configuration as needed
  });
}
