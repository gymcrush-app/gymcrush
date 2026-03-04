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

/**
 * Fetch place details from Google Places API (New)
 * @param placeId Google Places place_id
 * @returns Place details including location coordinates, or null if error
 */
export async function fetchPlaceDetails(
  placeId: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn('Google Places API key not configured');
    return null;
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
      console.warn(
        `Google Places API error: ${response.status} ${response.statusText}`,
        errorData
      );
      return null;
    }

    const data: PlaceDetailsResponse = await response.json();

    if (data.location?.latitude && data.location?.longitude) {
      return {
        lat: data.location.latitude,
        lng: data.location.longitude,
      };
    }

    console.warn('Place details response missing location data');
    return null;
  } catch (error: any) {
    console.warn('Error fetching place details:', error);
    return null;
  }
}
