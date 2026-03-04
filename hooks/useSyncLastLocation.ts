import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionStatus } from 'expo-location';
import { useLocation } from '@/hooks/useLocation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/authStore';
import { APP } from '@/theme';

const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MIN_MOVE_METERS = 500; // 0.5km

type StoredSync = { ts: number; lat: number; lng: number };

function toRadians(deg: number) {
  return deg * (Math.PI / 180);
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000; // meters
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * Keeps `profiles.last_location` updated based on device GPS (foreground).
 * Throttled to avoid write spam.
 */
export function useSyncLastLocation() {
  const user = useAuthStore((s) => s.user);
  const { location, permissionStatus, refreshLocation } = useLocation();
  const inFlightRef = useRef(false);

  const canSync = useMemo(
    () => !!user?.id && permissionStatus === PermissionStatus.GRANTED && !!location,
    [user?.id, permissionStatus, location]
  );

  const maybeSync = useCallback(
    async (coords: { lat: number; lng: number }) => {
      if (!user?.id) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const raw = await AsyncStorage.getItem(APP.STORAGE_KEYS.LAST_LOCATION_SYNC);
        const stored: StoredSync | null = raw ? JSON.parse(raw) : null;
        const now = Date.now();

        if (stored) {
          const elapsed = now - stored.ts;
          const moved = distanceMeters(coords, { lat: stored.lat, lng: stored.lng });
          if (elapsed < MIN_INTERVAL_MS && moved < MIN_MOVE_METERS) {
            return;
          }
        }

        const wkt = `SRID=4326;POINT(${coords.lng} ${coords.lat})`;
        const { error } = await supabase
          .from('profiles')
          .update({
            last_location: wkt,
            last_location_updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          if (__DEV__) {
            console.warn('[useSyncLastLocation] Failed to update last_location:', error);
          }
          return;
        }

        await AsyncStorage.setItem(
          APP.STORAGE_KEYS.LAST_LOCATION_SYNC,
          JSON.stringify({ ts: now, lat: coords.lat, lng: coords.lng } satisfies StoredSync)
        );
      } catch (e) {
        if (__DEV__) {
          console.warn('[useSyncLastLocation] Unexpected error:', e);
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [user?.id]
  );

  // Sync when we have a (new) location.
  useEffect(() => {
    if (!canSync || !location) return;
    maybeSync(location);
  }, [canSync, location, maybeSync]);

  // Refresh GPS (and then sync) on foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshLocation();
      }
    });
    return () => sub.remove();
  }, [refreshLocation]);
}

