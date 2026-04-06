import type { Router } from 'expo-router';
import type * as Notifications from 'expo-notifications';

export type AppNotificationData =
  | { type: 'match'; matchId?: string | null }
  | { type: 'message'; matchId?: string | null }
  | { type: 'crush_signal' }
  | { type: string; [key: string]: any };

export function getNotificationData(notification: Notifications.Notification): AppNotificationData | null {
  const data = (notification.request.content.data ?? {}) as any;
  if (!data || typeof data !== 'object') return null;
  return data as AppNotificationData;
}

export function routeForNotification(data: AppNotificationData): string | null {
  if (data.type === 'match') {
    if (data.matchId) return `/(tabs)/chat/${data.matchId}`;
    return '/(tabs)/chat';
  }
  if (data.type === 'message') {
    if (data.matchId) return `/(tabs)/chat/${data.matchId}`;
    return '/(tabs)/chat';
  }
  if (data.type === 'crush_signal') {
    return '/(tabs)/discover';
  }
  return null;
}

export function handleNotificationResponse(router: Router, response: Notifications.NotificationResponse) {
  const notification = response.notification;
  const data = getNotificationData(notification);
  if (!data) return;

  const route = routeForNotification(data);
  if (!route) return;

  router.push(route as any);
}

