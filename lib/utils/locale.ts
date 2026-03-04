/**
 * Locale Detection Utilities
 * 
 * Detects device locale settings to determine unit preferences
 */

/**
 * Countries/regions that use miles instead of kilometers
 */
const MILES_COUNTRIES = [
  'US', // United States
  'GB', // United Kingdom
  'LR', // Liberia
  'MM', // Myanmar
];

/**
 * Check if the device locale uses miles for distance measurement
 * @returns true if device uses miles, false if uses kilometers
 */
export function usesMiles(): boolean {
  try {
    // Get device locale
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    
    // Extract country code (e.g., "en-US" -> "US")
    const countryCode = locale.split('-')[1]?.toUpperCase();
    
    // Check if country uses miles
    return countryCode ? MILES_COUNTRIES.includes(countryCode) : false;
  } catch (error) {
    // Default to kilometers if locale detection fails
    console.warn('Failed to detect locale, defaulting to kilometers:', error);
    return false;
  }
}

/**
 * Convert kilometers to miles
 * @param km Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Convert miles to kilometers
 * @param miles Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

/**
 * Format distance for display based on locale
 * @param km Distance in kilometers
 * @param unit Optional unit override ('km' or 'mi')
 * @returns Formatted string like "26 km" or "16 mi"
 */
export function formatDistance(km: number | null, unit?: 'km' | 'mi'): string {
  if (km === null) {
    return '—';
  }
  
  const useMiles = unit === 'mi' || (unit === undefined && usesMiles());
  
  if (useMiles) {
    const miles = Math.ceil(kmToMiles(km));
    return `${miles} mi`;
  }
  
  return `${Math.ceil(km)} km`;
}
