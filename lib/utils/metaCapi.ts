/**
 * Meta Conversions API client helper.
 *
 * Forwards key in-app events to Meta CAPI via the `meta-capi-event` Supabase
 * edge function. The access token stays server-side; the client never sees it.
 *
 * Fire-and-forget: errors are logged but never thrown to the caller. Analytics
 * must never block app behaviour.
 */

import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

interface SendMetaEventArgs {
  /** Meta standard event name (e.g. CompleteRegistration, Purchase, Subscribe) or custom name. */
  eventName: string;
  /** Idempotency key — Meta dedupes events with the same id within a 7-day window. */
  eventId?: string;
  /** Plaintext email — hashed server-side before sending to Meta. */
  userEmail?: string;
  /** Supabase user id — hashed server-side as Meta `external_id`. */
  userId?: string;
  /** Meta custom_data fields (e.g. value, currency, content_ids). */
  customData?: Record<string, unknown>;
  /** Meta Events Manager test code — when set, event appears in the Test Events tab without affecting prod stats. */
  testEventCode?: string;
}

/** Meta standard event names we currently forward. */
export const MetaEvents = {
  CompleteRegistration: 'CompleteRegistration',
  Purchase: 'Purchase',
  Subscribe: 'Subscribe',
  Lead: 'Lead',
} as const;

export async function sendMetaCapiEvent({
  eventName,
  eventId,
  userEmail,
  userId,
  customData,
  testEventCode,
}: SendMetaEventArgs): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('meta-capi-event', {
      body: {
        event_name: eventName,
        event_id: eventId,
        user_email: userEmail,
        user_id: userId,
        custom_data: customData,
        client_user_agent: `GymCrush/${Platform.OS}`,
        test_event_code: testEventCode,
      },
    });
    if (error) {
      console.warn('[meta-capi] forwarding failed:', error.message);
    }
  } catch (err) {
    console.warn('[meta-capi] unexpected error:', err);
  }
}
