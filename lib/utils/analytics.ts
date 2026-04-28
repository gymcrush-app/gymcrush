/**
 * Analytics — Mixpanel wrapper + Meta Conversions API fan-out.
 *
 * track() sends every event to Mixpanel. A curated allowlist of events
 * (signups, purchases) is also forwarded to Meta CAPI for ad attribution.
 * Initialize Mixpanel in config/mixpanel.ts; use EXPO_PUBLIC_MIXPANEL_TOKEN.
 */

import { Mixpanel } from 'mixpanel-react-native';
import { MetaEvents, sendMetaCapiEvent } from './metaCapi';

let mixpanel: Mixpanel | null = null;

interface IdentifiedUser {
  id: string;
  email?: string;
}
let identifiedUser: IdentifiedUser | null = null;

/**
 * Mapping from internal event names to Meta standard event names.
 * Anything not in this map is Mixpanel-only.
 */
const META_EVENT_MAP: Record<string, { metaName: string; extractValue?: (props?: Record<string, any>) => { value?: number; currency?: string } }> = {
  signup_completed: { metaName: MetaEvents.CompleteRegistration },
  purchase_success: {
    metaName: MetaEvents.Purchase,
    extractValue: (p) => ({ value: p?.value, currency: p?.currency ?? 'USD' }),
  },
};

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

  const metaMapping = META_EVENT_MAP[eventName];
  if (metaMapping) {
    // Prefer identified user; fall back to ids passed in properties so events
    // fired before identify() (e.g. signup_completed) still attribute.
    const userId = identifiedUser?.id ?? (typeof properties?.user_id === 'string' ? properties.user_id : undefined);
    const userEmail = identifiedUser?.email ?? (typeof properties?.email === 'string' ? properties.email : undefined);

    if (userId || userEmail) {
      const customData: Record<string, unknown> = { ...properties };
      delete customData.user_id;
      delete customData.email;
      delete customData.event_id;
      if (metaMapping.extractValue) {
        const { value, currency } = metaMapping.extractValue(properties);
        if (value !== undefined) customData.value = value;
        if (currency !== undefined) customData.currency = currency;
      }
      // Fire-and-forget — never await analytics in the call site
      void sendMetaCapiEvent({
        eventName: metaMapping.metaName,
        eventId: properties?.event_id,
        userId,
        userEmail,
        customData,
      });
    }
  }
}

export function identify(userId: string, traits?: Record<string, any>) {
  identifiedUser = {
    id: userId,
    email: typeof traits?.email === 'string' ? traits.email : undefined,
  };
  if (mixpanel) {
    mixpanel.identify(userId);
    if (traits) {
      mixpanel.getPeople().set(traits);
    }
  }
}

export function reset() {
  identifiedUser = null;
  if (mixpanel) {
    mixpanel.reset();
  }
}
