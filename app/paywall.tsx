import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { useRevenueCatStore } from '@/lib/stores/revenueCatStore';
import { track } from '@/lib/utils/analytics';
import { palette } from '@/theme/colors';

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
  const offeringsError = useRevenueCatStore((s) => s.offeringsError);

  useEffect(() => {
    track('paywall_viewed', {
      offering_id: offering?.identifier ?? null,
      has_offering: !!offering,
      offerings_error: offeringsError ?? null,
    });
  }, [offering, offeringsError]);

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

  if (!offering) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Subscriptions unavailable</Text>
          <Text style={styles.fallbackBody}>
            Pending App Store Connect paid apps agreement and tax info. Once
            the agreement is active and banking/tax forms are complete,
            subscriptions will appear here automatically.
          </Text>
          {offeringsError ? (
            <Text style={styles.fallbackDetail}>Detail: {offeringsError}</Text>
          ) : null}
          <Pressable onPress={dismiss} style={styles.fallbackButton}>
            <Text style={styles.fallbackButtonText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <RevenueCatUI.Paywall
        options={{ offering }}
        onDismiss={dismiss}
        onPurchaseStarted={({ packageBeingPurchased }) => {
          track('purchase_started', {
            package_id: packageBeingPurchased.identifier,
            product_id: packageBeingPurchased.product.identifier,
            price: packageBeingPurchased.product.price,
            currency: packageBeingPurchased.product.currencyCode,
            offering_id: offering.identifier,
          });
        }}
        onPurchaseCompleted={({ storeTransaction }) => {
          track('purchase_success', {
            product_id: storeTransaction.productIdentifier,
            transaction_id: storeTransaction.transactionIdentifier,
            offering_id: offering.identifier,
          });
          dismiss();
        }}
        onPurchaseError={({ error }) => {
          track('purchase_failed', {
            code: error.code,
            message: error.message,
            offering_id: offering.identifier,
          });
        }}
        onPurchaseCancelled={() => {
          /* keep paywall open — user may change their mind */
        }}
        onRestoreStarted={() => {
          track('restore_started', { offering_id: offering.identifier });
        }}
        onRestoreCompleted={({ customerInfo }) => {
          track('restore_success', {
            active_entitlements: Object.keys(customerInfo.entitlements.active),
            offering_id: offering.identifier,
          });
          dismiss();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: palette.dark900,
    justifyContent: 'center',
    padding: 24,
  },
  fallbackCard: {
    backgroundColor: palette.dark700,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.dark600,
  },
  fallbackTitle: {
    color: palette.light100,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  fallbackBody: {
    color: palette.light100,
    fontSize: 15,
    lineHeight: 22,
  },
  fallbackDetail: {
    color: palette.dark500,
    fontSize: 12,
    marginTop: 16,
  },
  fallbackButton: {
    marginTop: 24,
    backgroundColor: palette.peach100,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  fallbackButtonText: {
    color: palette.peachDark,
    fontSize: 16,
    fontWeight: '600',
  },
});
