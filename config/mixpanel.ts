/**
 * Mixpanel — analytics. Call initMixpanel() from app/_layout.tsx on app start.
 * Uses EXPO_PUBLIC_MIXPANEL_TOKEN.
 */

import { initAnalytics } from '@/lib/utils/analytics';

export function initMixpanel() {
  const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

  if (!token) {
    console.warn('Mixpanel token not configured');
    return;
  }

  initAnalytics(token);
}
