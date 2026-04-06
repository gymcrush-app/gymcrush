import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export type NotificationPermissionStatus = Notifications.PermissionStatus;

// Hardcoded fallback -- in EAS preview/production builds, Constants.expoConfig
// may be null and easConfig doesn't exist until SDK 54+.
const EAS_PROJECT_ID = '4b975cb8-e751-482a-8b1b-75d316cd7613';

export function getExpoProjectId(): string {
  return (
    (Constants as any)?.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    EAS_PROJECT_ID
  );
}

export async function getNotificationPermissionsAsync() {
  return Notifications.getPermissionsAsync();
}

export async function requestNotificationPermissionsAsync() {
  return Notifications.requestPermissionsAsync();
}

export async function getExpoPushTokenAsync() {
  const projectId = getExpoProjectId();
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export function getDeviceId(): string | null {
  // Expo doesn't give a stable cross-install device identifier.
  // This is best-effort and primarily for debugging / multi-device display.
  return Device.modelId ?? Device.modelName ?? null;
}

export function getPlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export async function upsertPushToken(params: {
  userId: string;
  expoPushToken: string;
  deviceId?: string | null;
  platform?: 'ios' | 'android';
}) {
  const { userId, expoPushToken } = params;
  const deviceId = params.deviceId ?? getDeviceId();
  const platform = params.platform ?? getPlatform();

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      device_id: deviceId ?? undefined,
      platform,
      is_active: true,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,expo_push_token' }
  );

  if (error) throw error;
}

export async function deactivatePushToken(expoPushToken: string) {
  const { error } = await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('expo_push_token', expoPushToken);
  if (error) throw error;
}

export async function registerForPushNotificationsAsync(userId: string) {
  console.log('[Push] registerForPushNotificationsAsync called, userId:', userId);

  if (!Device.isDevice) {
    console.log('[Push] Not a physical device -- skipping');
    return { status: 'not-device' as const };
  }

  const permissions = await getNotificationPermissionsAsync();
  let status = permissions.status;
  console.log('[Push] Current permission status:', status);

  if (status !== 'granted') {
    const req = await requestNotificationPermissionsAsync();
    status = req.status;
    console.log('[Push] Requested permission, new status:', status);
  }

  if (status !== 'granted') {
    console.log('[Push] Permission denied -- aborting');
    return { status: 'denied' as const };
  }

  // Android notification channel is required for importance/sound behavior.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'notification.caf',
    });
  }

  const projectId = getExpoProjectId();
  console.log('[Push] Project ID:', projectId);

  const expoPushToken = await getExpoPushTokenAsync();
  console.log('[Push] Got Expo push token:', expoPushToken);

  await upsertPushToken({ userId, expoPushToken });
  console.log('[Push] Token upserted to DB successfully');

  return { status: 'registered' as const, expoPushToken };
}

