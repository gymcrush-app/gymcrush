/**
 * Google Places API Utilities
 *
 * Functions for interacting with Google Places API (New)
 */

interface PlaceDetailsResponse {
  id: string;
  displayName?: {
    text: string;
    languageCode: string;
  };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface PlaceDetailsFull {
  formattedAddress: string | null;
  location: { lat: number; lng: number } | null;
}

/**
 * Fetch full place details (address + coordinates) from Google Places API (New).
 * Use this when you need both formattedAddress and location for create-gym / resolveHomeGym.
 *
 * @param placeId Google Places place_id
 * @returns formattedAddress and location, or null values if missing/error
 */
export async function fetchPlaceDetailsFull(
  placeId: string
): Promise<PlaceDetailsFull> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  const empty: PlaceDetailsFull = {
    formattedAddress: null,
    location: null,
  };

  if (!apiKey) {
    if (__DEV__) console.warn('[fetchPlaceDetailsFull] Google Places API key not configured');
    return empty;
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (__DEV__) {
        console.warn(
          '[fetchPlaceDetailsFull] API error:',
          response.status,
          response.statusText,
          errorData
        );
      }
      return empty;
    }

    const data: PlaceDetailsResponse = await response.json();

    const formattedAddress =
      typeof data.formattedAddress === 'string' && data.formattedAddress.trim().length > 0
        ? data.formattedAddress.trim()
        : null;

    const location =
      data.location?.latitude != null && data.location?.longitude != null
        ? {
            lat: data.location.latitude,
            lng: data.location.longitude,
          }
        : null;

    if (__DEV__) {
      console.log('[fetchPlaceDetailsFull] Place Details response:', {
        placeId,
        formattedAddress: formattedAddress ?? '(empty)',
        location: location ?? '(none)',
        rawKeys: Object.keys(data),
      });
    }

    return { formattedAddress, location };
  } catch (error: unknown) {
    if (__DEV__) console.warn('[fetchPlaceDetailsFull] Error:', error);
    return empty;
  }
}

/**
 * Fetch place details from Google Places API (New) — location only (legacy).
 * @param placeId Google Places place_id
 * @returns Location coordinates, or null if error/missing
 */
export async function fetchPlaceDetails(
  placeId: string
): Promise<{ lat: number; lng: number } | null> {
  const full = await fetchPlaceDetailsFull(placeId);
  return full.location;
}
