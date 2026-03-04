import { useState, useCallback, useRef } from 'react';
import type { GooglePlaceGym } from '@/types/onboarding';
import { useLocation } from './useLocation';

interface UseGymSearchResult {
  results: GooglePlaceGym[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

interface GooglePlacesAutocompleteResponse {
  suggestions: Array<{
    placePrediction: {
      placeId: string;
      text: {
        text: string;
      };
      structuredFormat: {
        mainText: {
          text: string;
        };
        secondaryText: {
          text: string;
        };
      };
    };
  }>;
}

// Default location bias: Center of North America (Kansas, USA)
// This provides reasonable results for most North American users
// Used as fallback when user location is not available
const DEFAULT_LOCATION_BIAS = {
  circle: {
    center: {
      latitude: 39.8283,
      longitude: -98.5795,
    },
    radius: 50000, // 50km radius
  },
};

export function useGymSearch(): UseGymSearchResult {
  const [results, setResults] = useState<GooglePlaceGym[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { location } = useLocation();

  const search = useCallback(async (searchQuery: string) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state for short queries
    if (searchQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
        throw new Error('Google Places API key not configured');
      }

      // Use user location if available, otherwise fallback to default
      const locationBias = location
        ? {
            circle: {
              center: {
                latitude: location.lat,
                longitude: location.lng,
              },
              radius: 50000, // 50km radius
            },
          }
        : DEFAULT_LOCATION_BIAS;

      const response = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
          },
          body: JSON.stringify({
            input: searchQuery,
            includedPrimaryTypes: ['gym'],
            locationBias,
          }),
          signal: abortController.signal,
        }
      );

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Google Places API error: ${response.status} ${response.statusText}`
        );
      }

      const data: GooglePlacesAutocompleteResponse = await response.json();

      // Transform API response to GooglePlaceGym format
      const transformedResults: GooglePlaceGym[] = (data.suggestions || []).map(
        (suggestion) => ({
          place_id: suggestion.placePrediction.placeId,
          name:
            suggestion.placePrediction.structuredFormat?.mainText?.text ||
            suggestion.placePrediction.text.text,
          formatted_address:
            suggestion.placePrediction.structuredFormat?.secondaryText?.text ||
            '',
          // Location coordinates would require a separate Places API call
          // For now, we'll leave it optional
          location: undefined,
        })
      );

      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setResults(transformedResults);
        setIsLoading(false);
        setError(null);
      }
    } catch (err: any) {
      // Don't update state if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      // Handle different error types
      if (err.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }

      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err.message?.includes('API key')) {
        setError('API configuration error. Please contact support.');
      } else if (err.message?.includes('quota') || err.message?.includes('billing')) {
        setError('Service temporarily unavailable. Please try again later.');
      } else {
        setError(err.message || 'Failed to search gyms. Please try again.');
      }

      setResults([]);
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
  };
}
