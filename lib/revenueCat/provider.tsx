import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import * as Sentry from '@sentry/react-native';
import { useAuthStore } from '@/lib/stores/authStore';
import { useRevenueCatStore } from '@/lib/stores/revenueCatStore';
import { buildMockOfferings } from './devMock';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';

function describeRcError(err: unknown): string {
  if (!err) return 'unknown';
  if (err instanceof Error) {
    // RC surfaces readable codes on the underlying error object via `userInfo`
    const anyErr = err as Error & {
      userInfo?: { readableErrorCode?: string };
      code?: string | number;
    };
    const code = anyErr.userInfo?.readableErrorCode ?? anyErr.code;
    return code ? `${code}: ${err.message}` : err.message;
  }
  return String(err);
}

/** Manually refetch offerings — used by the debug "Retry" button. */
export async function refetchOfferings() {
  const store = useRevenueCatStore.getState();

  console.log('[RC-DEBUG] calling getOfferings()...');
  Sentry.captureMessage('[RC] refetchOfferings: calling getOfferings()', { level: 'info' });
  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) throw new Error('getOfferings returned null current');
    console.log('[RC-DEBUG] getOfferings OK', {
      current: offerings.current.identifier,
      currentPkgCount: offerings.current.availablePackages.length,
    });
    Sentry.captureMessage('[RC] refetchOfferings: OK', {
      level: 'info',
      extra: {
        currentOfferingId: offerings.current.identifier,
        currentPkgCount: offerings.current.availablePackages.length,
        allOfferingIds: Object.keys(offerings.all),
      },
    });
    store.setOfferings(offerings);
  } catch (err) {
    const msg = describeRcError(err);
    console.log('[RC-DEBUG] getOfferings FAILED:', msg);
    Sentry.captureMessage('[RC] refetchOfferings: FAILED', {
      level: 'error',
      extra: { message: msg },
    });
    if (__DEV__) {
      console.log('[RC-DEBUG] __DEV__ — injecting mock offerings so UI can render');
      store.setOfferings(buildMockOfferings());
      store.setOfferingsError(`${msg} (using dev mock)`);
    } else {
      store.setOfferingsError(msg);
    }
  }
}

/**
 * Mounts once at app startup. Initializes RevenueCat, mirrors CustomerInfo +
 * offerings into the Zustand store, and keeps the RC identity aligned with
 * the current Supabase user.
 *
 * Android is a no-op until Phase 5 wires Google Play.
 */
export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const setCustomerInfo = useRevenueCatStore((s) => s.setCustomerInfo);
  const setOfferings = useRevenueCatStore((s) => s.setOfferings);
  const setOfferingsError = useRevenueCatStore((s) => s.setOfferingsError);
  const setConfigured = useRevenueCatStore((s) => s.setConfigured);
  const resetStore = useRevenueCatStore((s) => s.reset);
  const lastLoggedInUserId = useRef<string | null>(null);
  const configuredRef = useRef(false);

  // One-time configure on mount (iOS only for now)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (configuredRef.current) return;
    if (!RC_IOS_KEY) {
      console.warn('[RevenueCat] EXPO_PUBLIC_RC_IOS_KEY missing; SDK not configured.');
      Sentry.captureMessage('[RC] init: RC_IOS_KEY missing — SDK not configured', {
        level: 'error',
      });
      return;
    }

    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    // appUserID left undefined at configure time — we call logIn once the
    // Supabase user resolves. This avoids a brief anonymous identity period.
    Purchases.configure({ apiKey: RC_IOS_KEY });
    configuredRef.current = true;
    setConfigured(true);
    Sentry.captureMessage('[RC] init: configured', {
      level: 'info',
      extra: {
        keyPrefix: RC_IOS_KEY.slice(0, 8),
        keyLength: RC_IOS_KEY.length,
      },
    });

    const customerInfoListener = (info: Parameters<Parameters<typeof Purchases.addCustomerInfoUpdateListener>[0]>[0]) => {
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [setCustomerInfo, setConfigured]);

  // Sync RC identity with Supabase session
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!configuredRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        if (userId) {
          if (lastLoggedInUserId.current === userId) return;
          const { customerInfo } = await Purchases.logIn(userId);
          lastLoggedInUserId.current = userId;
          Sentry.captureMessage('[RC] identity: logIn OK', {
            level: 'info',
            extra: {
              userIdPrefix: userId.slice(0, 8),
              activeEntitlements: Object.keys(customerInfo.entitlements.active),
            },
          });
          if (!cancelled) setCustomerInfo(customerInfo);
        } else if (lastLoggedInUserId.current) {
          await Purchases.logOut();
          lastLoggedInUserId.current = null;
          Sentry.captureMessage('[RC] identity: logOut OK', { level: 'info' });
          if (!cancelled) resetStore();
        }
      } catch (err) {
        console.warn('[RevenueCat] identity sync failed', err);
        Sentry.captureMessage('[RC] identity: sync FAILED', {
          level: 'error',
          extra: { message: describeRcError(err) },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, setCustomerInfo, resetStore]);

  // Fetch current offerings whenever signed in (or anonymous after configure).
  // Paywall UI depends on this landing in the store.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!configuredRef.current) return;

    let cancelled = false;
    (async () => {
      console.log('[RC-DEBUG] initial fetch: calling getOfferings()...');
      Sentry.captureMessage('[RC] initial fetch: calling getOfferings()', { level: 'info' });
      try {
        const offerings = await Purchases.getOfferings();
        if (!offerings.current) throw new Error('getOfferings returned null current');
        console.log('[RC-DEBUG] initial getOfferings OK', {
          current: offerings.current.identifier,
          currentPkgCount: offerings.current.availablePackages.length,
        });
        Sentry.captureMessage('[RC] initial getOfferings: OK', {
          level: 'info',
          extra: {
            currentOfferingId: offerings.current.identifier,
            currentPkgCount: offerings.current.availablePackages.length,
            allOfferingIds: Object.keys(offerings.all),
            packageIds: offerings.current.availablePackages.map((p) => p.identifier),
          },
        });
        if (!cancelled) setOfferings(offerings);
      } catch (err) {
        const msg = describeRcError(err);
        console.log('[RC-DEBUG] initial getOfferings FAILED:', msg);
        Sentry.captureMessage('[RC] initial getOfferings: FAILED', {
          level: 'error',
          extra: { message: msg },
        });
        if (cancelled) return;
        if (__DEV__) {
          console.log('[RC-DEBUG] __DEV__ — injecting mock offerings so UI can render');
          setOfferings(buildMockOfferings());
          setOfferingsError(`${msg} (using dev mock)`);
        } else {
          setOfferingsError(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, setOfferings, setOfferingsError]);

  return <>{children}</>;
}
