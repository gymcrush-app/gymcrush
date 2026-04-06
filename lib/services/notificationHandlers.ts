import * as Notifications from 'expo-notifications';
import type { Subscription } from 'expo-notifications';

export function configureNotificationPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      // iOS 16+ / SDK 54 expects these fields as well
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function addForegroundNotificationListener(
  onNotification: (notification: Notifications.Notification) => void
): Subscription {
  return Notifications.addNotificationReceivedListener(onNotification);
}

export function addNotificationResponseListener(
  onResponse: (response: Notifications.NotificationResponse) => void
): Subscription {
  return Notifications.addNotificationResponseReceivedListener(onResponse);
}

export async function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

