import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  getNotificationPermissionsAsync,
  registerForPushNotificationsAsync,
} from '@/lib/services/notifications';

type NotificationsState = {
  permissionStatus: Notifications.PermissionStatus | null;
  isRegistering: boolean;
  expoPushToken: string | null;
  lastError: string | null;
};

export function useNotifications() {
  const { user } = useAuthStore();

  const [state, setState] = useState<NotificationsState>({
    permissionStatus: null,
    isRegistering: false,
    expoPushToken: null,
    lastError: null,
  });

  const refreshPermissionStatus = useCallback(async () => {
    const p = await getNotificationPermissionsAsync();
    setState((s) => ({ ...s, permissionStatus: p.status }));
    return p.status;
  }, []);

  const register = useCallback(async () => {
    if (!user) return;

    setState((s) => ({ ...s, isRegistering: true, lastError: null }));
    try {
      const res = await registerForPushNotificationsAsync(user.id);
      await refreshPermissionStatus();

      if (res.status === 'registered') {
        setState((s) => ({ ...s, expoPushToken: res.expoPushToken, isRegistering: false }));
        return;
      }

      setState((s) => ({ ...s, isRegistering: false }));
    } catch (e: any) {
      console.error('[Push] Registration failed:', e?.message, e);
      setState((s) => ({
        ...s,
        isRegistering: false,
        lastError: e?.message ?? 'Failed to register for notifications',
      }));
    }
  }, [refreshPermissionStatus, user]);

  // On login / app start, read permission and attempt registration.
  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  useEffect(() => {
    if (!user) {
      setState((s) => ({ ...s, expoPushToken: null }));
      return;
    }
    register();
  }, [register, user]);

  return useMemo(
    () => ({
      ...state,
      refreshPermissionStatus,
      requestPermissionAndRegister: register,
    }),
    [refreshPermissionStatus, register, state]
  );
}

