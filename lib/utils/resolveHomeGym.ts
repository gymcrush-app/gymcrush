/**
 * Resolve home gym from onboarding-style selected gym data (Google Place JSON).
 * Calls create-gym edge function which looks up by google_place_id or creates the gym;
 * avoids client-side gyms read so RLS/visibility is not an issue.
 */

import { supabase } from '@/lib/supabase';

export interface SelectedGymPayload {
  id: string; // Google Places place_id
  name: string;
  address: string;
  location?: { lat: number; lng: number };
}

/**
 * Resolve a selected gym (from onboarding JSON) to our database gym id.
 * Uses the create-gym edge function (lookup-or-create) so the server handles
 * gyms with service role and returns the id.
 * @param selectedGymJson - JSON string of first selected gym: { id, name, address, location? }
 * @returns Database gym id, or null if none selected / resolution fails
 */
export async function resolveHomeGym(selectedGymJson: string): Promise<string | null> {
  try {
    const gymData = JSON.parse(selectedGymJson) as SelectedGymPayload;
    const googlePlaceId =
      typeof gymData?.id === 'string' ? gymData.id.trim() : '';
    const name = typeof gymData?.name === 'string' ? gymData.name.trim() : '';
    const address =
      typeof gymData?.address === 'string' ? gymData.address.trim() : '';

    if (!googlePlaceId) {
      if (__DEV__) console.log('[resolveHomeGym] Missing or invalid id (google_place_id) in payload');
      return null;
    }

    if (!name) {
      if (__DEV__) console.log('[resolveHomeGym] Missing or empty name in payload');
      return null;
    }

    if (!address) {
      if (__DEV__) console.log('[resolveHomeGym] Missing or empty address in payload; create-gym requires formatted_address');
      return null;
    }

    if (__DEV__) {
      console.log('[resolveHomeGym] Calling create-gym with:', {
        google_place_id: googlePlaceId,
        name,
        formatted_address: address,
        addressLength: address.length,
        hasLocation: !!gymData.location,
      });
    }

    // Use cached session first so we don't hang on refreshSession() (which can block if Auth is slow)
    const { data: sessionData } = await supabase.auth.getSession();
    let accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      if (__DEV__) console.log('[resolveHomeGym] No auth session');
      return null;
    }
    console.log('[resolveHomeGym] auth done hasToken=true');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      if (__DEV__) console.log('[resolveHomeGym] Missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    console.log('[resolveHomeGym] fetch start');
    let response: Response;
    try {
      response = await fetch(`${supabaseUrl}/functions/v1/create-gym`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          google_place_id: googlePlaceId,
          name,
          formatted_address: address,
          location: gymData.location,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[resolveHomeGym] fetch done status=', response.status);
    const result = await response.json().catch((e) => {
      console.log('[resolveHomeGym] response.json error', e);
      return {};
    });

    console.log('[resolveHomeGym] create-gym response:', {
      status: response.status,
      ok: response.ok,
      resultId: result?.id ?? '(none)',
      resultError: result?.error,
      resultKeys: typeof result === 'object' && result ? Object.keys(result) : [],
    });

    if (response.ok && result?.id) {
      if (__DEV__) console.log('[resolveHomeGym] Resolved gym id:', result.id);
      return result.id;
    }

    if (__DEV__) {
      console.warn(
        '[resolveHomeGym] create-gym failed:',
        'status',
        response.status,
        'body',
        result
      );
      if (response.status === 400) {
        console.warn('[resolveHomeGym] Likely missing required fields: google_place_id, name, formatted_address');
      }
    }
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    console.log(
      '[resolveHomeGym] Error:',
      isAbort ? 'fetch timeout (15s)' : message,
      err
    );
    return null;
  }
}
