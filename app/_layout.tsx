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

try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
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
  const initialize = useAuthStore((s) => s.initialize);
  const clearOnboardingData = useOnboardingStore((s) => s.clearData);
  const prevUserIdRef = useRef<string | null>(null);
  const isReady = useAppReadyStore((s) => s.isReady);

  useSyncLastLocation();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  useEffect(() => {
    // Initialize auth state from persisted storage
    initialize();

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
      
      if (session?.user) {
        await initialize();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, setSession, clearOnboardingData]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session) {
      // Not signed in, redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (session && !isOnboarded) {
      // Signed in but not onboarded, redirect to onboarding
      if (!inAuthGroup || segments[1] !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      }
    } else if (session && isOnboarded) {
      // Signed in and onboarded, redirect to tabs
      if (!inTabsGroup) {
        router.replace('/(tabs)/discover');
      }
    }
  }, [session, isOnboarded, isLoading, segments, router]);

  return <>{children}</>;
}
