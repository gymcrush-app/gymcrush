/**
 * Analytics — Mixpanel wrapper: initAnalytics, track, identify, reset.
 * Initialize Mixpanel in config/mixpanel.ts; use EXPO_PUBLIC_MIXPANEL_TOKEN from env.
 */

import { Mixpanel } from 'mixpanel-react-native';

let mixpanel: Mixpanel | null = null;

export function initAnalytics(token: string) {
  if (!mixpanel) {
    mixpanel = new Mixpanel(token, false);
    mixpanel.init();
  }
  return mixpanel;
}

export function track(eventName: string, properties?: Record<string, any>) {
  if (mixpanel) {
    mixpanel.track(eventName, properties);
  }
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (mixpanel) {
    mixpanel.identify(userId);
    if (traits) {
      mixpanel.getPeople().set(traits);
    }
  }
}

export function reset() {
  if (mixpanel) {
    mixpanel.reset();
  }
}
