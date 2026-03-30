import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { PermissionStatus } from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP } from '@/theme';

interface LocationCoords {
  lat: number;
  lng: number;
}

interface UseLocationResult {
  location: LocationCoords | null;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

/**
 * Hook to manage location permissions and get current location
 * Caches location to avoid repeated requests
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(
    PermissionStatus.UNDETERMINED
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permission status and get location if granted
  const checkPermissionAndGetLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (__DEV__) {
        const stored = await AsyncStorage.getItem(APP.STORAGE_KEYS.DEV_LOCATION_OVERRIDE);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as { lat?: number; lng?: number };
            if (
              typeof parsed?.lat === 'number' &&
              typeof parsed?.lng === 'number' &&
              Math.abs(parsed.lat) <= 90 &&
              Math.abs(parsed.lng) <= 180
            ) {
              setLocation({ lat: parsed.lat, lng: parsed.lng });
              setIsLoading(false);
              return;
            }
          } catch {
            // invalid JSON, fall through to real location
          }
        }
      }

      // Check current permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status === PermissionStatus.GRANTED) {
        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Good balance between accuracy and battery
        });

        setLocation({
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        });
      } else {
        setLocation(null);
      }
    } catch (err: any) {
      console.error('Error getting location:', err);
      setError(err.message || 'Failed to get location');
      setLocation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkPermissionAndGetLocation();
  }, [checkPermissionAndGetLocation]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status === PermissionStatus.GRANTED) {
        // Get location after permission granted
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation({
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        });
        return true;
      } else {
        setLocation(null);
        return false;
      }
    } catch (err: any) {
      console.error('Error requesting location permission:', err);
      setError(err.message || 'Failed to request location permission');
      setLocation(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh location (useful when user returns from settings)
  const refreshLocation = useCallback(async () => {
    await checkPermissionAndGetLocation();
  }, [checkPermissionAndGetLocation]);

  return {
    location,
    permissionStatus,
    isLoading,
    error,
    requestPermission,
    refreshLocation,
  };
}
