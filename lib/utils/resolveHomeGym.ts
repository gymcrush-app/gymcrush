/**
 * Resolve home gym from onboarding-style selected gym data (Google Place JSON).
 * Looks up by google_place_id or creates the gym using the insert_gym_with_location
 * RPC (SECURITY DEFINER — bypasses RLS).
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
 * Looks up by google_place_id first; if not found, creates via RPC.
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

    if (!googlePlaceId || !name || !address) {
      if (__DEV__) console.log('[resolveHomeGym] Missing required field', { googlePlaceId, name, address });
      return null;
    }

    if (__DEV__) {
      console.log('[resolveHomeGym] Resolving gym:', { googlePlaceId, name, hasLocation: !!gymData.location });
    }

    // 1. Check if gym already exists
    const { data: existingGym } = await supabase
      .from('gyms')
      .select('id')
      .eq('google_place_id', googlePlaceId)
      .single();

    if (existingGym?.id) {
      if (__DEV__) console.log('[resolveHomeGym] Found existing gym:', existingGym.id);
      return existingGym.id;
    }

    // 2. Parse address for city/state/country
    const parts = address.split(',').map((s) => s.trim());
    let city = 'Unknown';
    let state = 'Unknown';
    let country = 'Unknown';

    if (parts.length >= 4) {
      country = parts[parts.length - 1];
      state = parts[parts.length - 2];
      city = parts[parts.length - 3];
    } else if (parts.length >= 3) {
      city = parts[parts.length - 2];
      state = parts[parts.length - 1];
    } else if (parts.length === 2) {
      city = parts[1];
    }

    const lng = gymData.location?.lng ?? 0;
    const lat = gymData.location?.lat ?? 0;

    // 3. Create gym via SECURITY DEFINER RPC (bypasses RLS)
    const { data: gymId, error: rpcError } = await supabase.rpc(
      'insert_gym_with_location',
      {
        p_google_place_id: googlePlaceId,
        p_name: name,
        p_address: address,
        p_city: city,
        p_state: state,
        p_country: country,
        p_lng: lng,
        p_lat: lat,
      }
    );

    if (rpcError) {
      if (__DEV__) console.warn('[resolveHomeGym] RPC error:', rpcError);
      return null;
    }

    if (__DEV__) console.log('[resolveHomeGym] Created gym:', gymId);
    return gymId;
  } catch (err) {
    if (__DEV__) console.warn('[resolveHomeGym] Error:', err);
    return null;
  }
}
