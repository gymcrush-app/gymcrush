import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Platform, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { useRevenueCatStore } from '@/lib/stores/revenueCatStore';

/**
 * Full-screen modal paywall backed by the RC PaywallView. The paywall design
 * itself lives in RC's dashboard Paywall Editor, attached to the `default`
 * offering. Changes there ship without an app update.
 *
 * Route: pushed via `router.push('/paywall')` from any gated feature.
 */
export default function PaywallScreen() {
  const router = useRouter();
  const offering = useRevenueCatStore((s) => s.currentOffering);

  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/discover');
  }, [router]);

  if (Platform.OS !== 'ios') {
    // Android paywall support lands with Phase 5 (Play Store). Until then,
    // dismiss immediately so gated flows don't hang.
    dismiss();
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <RevenueCatUI.Paywall
        options={offering ? { offering } : undefined}
        onDismiss={dismiss}
        onPurchaseCompleted={dismiss}
        onPurchaseCancelled={() => {
          /* keep paywall open — user may change their mind */
        }}
        onRestoreCompleted={dismiss}
      />
    </View>
  );
}
