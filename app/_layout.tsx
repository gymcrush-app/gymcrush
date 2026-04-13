import { myriadProFonts } from '@/lib/fonts';
import { useAppReadyStore } from '@/lib/stores/appReadyStore';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/authStore';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { layout } from '@/lib/styles';
import { useSyncLastLocation } from '@/hooks/useSyncLastLocation';
import { ZoomPortalProvider } from '@/lib/contexts/ZoomPortalContext';
import { useNotifications } from '@/hooks/useNotifications';
import {
  addForegroundNotificationListener,
  addNotificationResponseListener,
  configureNotificationPresentation,
  getLastNotificationResponse,
} from '@/lib/services/notificationHandlers';
import { handleNotificationResponse } from '@/lib/services/notificationResponseHandler';
import { initMixpanel } from '@/config/mixpanel';
import { identify, reset as resetAnalytics, track } from '@/lib/utils/analytics';

try {
  SplashScreen.preventAutoHideAsync();
} catch {
  // Splash API may not be available on all platforms
}

// Suppress harmless warnings from third-party libraries
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(myriadProFonts);

  useEffect(() => {
    initMixpanel();
    track('app_open');
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={layout.flex1}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <ZoomPortalProvider>
            <AuthStateChangeHandler>
              <Slot />
            </AuthStateChangeHandler>
          </ZoomPortalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AuthStateChangeHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setSession = useAuthStore((s) => s.setSession);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const authResolved = useAuthStore((s) => s.authResolved);
  const clearOnboardingData = useOnboardingStore((s) => s.clearData);
  const prevUserIdRef = useRef<string | null>(null);
  const setAppReady = useAppReadyStore((s) => s.setReady);
  const isReady = useAppReadyStore((s) => s.isReady);
  const hasRouted = useRef(false);

  useSyncLastLocation();
  useNotifications();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  useEffect(() => {
    configureNotificationPresentation();

    const sub1 = addForegroundNotificationListener(() => {
      // Later: in-app banners / query invalidation
    });

    const sub2 = addNotificationResponseListener((response) => {
      handleNotificationResponse(router, response);
    });

    (async () => {
      const last = await getLastNotificationResponse();
      if (last) handleNotificationResponse(router, last);
    })();

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!hasHydrated) return;

    // Resolve initial session deterministically before routing decisions.
    bootstrap();

    // Set up Supabase auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const previousUserId = prevUserIdRef.current;
      const nextUserId = session?.user?.id ?? null;

      if (previousUserId && nextUserId && nextUserId !== previousUserId) {
        clearOnboardingData();
      }

      prevUserIdRef.current = nextUserId;

      setSession(session);

      // Fetch profile so routing guard can make decisions.
      // Only do this for sign-in events (not TOKEN_REFRESHED which fires frequently).
      // For SIGNED_IN after signup, the profile won't exist yet — initialize()
      // handles that gracefully and clears isLoading/authResolved.
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        await useAuthStore.getState().initialize();
        const profile = useAuthStore.getState().profile;
        identify(session.user.id, {
          $email: session.user.email,
          display_name: profile?.display_name,
          is_onboarded: profile?.is_onboarded ?? false,
        });
      } else if (!session) {
        // Signed out — ensure resolved state + reset analytics identity
        resetAnalytics();
        useAuthStore.setState({ isLoading: false, authResolved: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [bootstrap, hasHydrated, setSession, clearOnboardingData]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!authResolved) return;
    if (isLoading) return;

    // Profile may be null for brand-new signups — authResolved + !isLoading
    // (checked above) already guarantee the profile fetch has completed.

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    // Keep splash up until we are on the *final* route for the resolved auth state.
    // This prevents a brief flash of a restored screen (e.g. onboarding home gym) before redirect.
    if (!session) {
      const onAuthScreen = inAuthGroup && (segments[1] === 'login' || segments[1] === 'signup');
      if (!onAuthScreen) {
        router.replace('/(auth)/login');
        return;
      }
    } else if (!isOnboarded) {
      const onOnboarding = inAuthGroup && segments[1] === 'onboarding';
      if (!onOnboarding) {
        router.replace('/(auth)/onboarding');
        return;
      }
    } else {
      const onTabs = inTabsGroup;
      if (!onTabs) {
        router.replace('/(tabs)/discover');
        return;
      }
    }

    // Auth is resolved and we are on the correct route — hide splash on next frame.
    if (!hasRouted.current) {
      hasRouted.current = true;
      requestAnimationFrame(() => setAppReady());
    }
  }, [session, isOnboarded, isLoading, authResolved, hasHydrated, segments, router, setAppReady]);

  return <>{children}</>;
}
