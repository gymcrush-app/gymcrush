import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { reset as resetAnalytics } from './analytics';

export async function signOutAndReset() {
  const { clearSession } = useAuthStore.getState();

  // Local-first: update UI state immediately, even offline.
  clearSession();
  useOnboardingStore.getState().clearData();
  resetAnalytics();

  // Best-effort Supabase sign-out. Prefer local scope to avoid hanging on poor networks.
  try {
    const signOutPromise = supabase.auth.signOut({ scope: 'local' as any });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('signOut timeout')), 6000)
    );
    await Promise.race([signOutPromise as any, timeoutPromise]);
  } catch (e) {
    // If this fails (or times out), user is still locally signed out; remote session will expire/refresh later.
    console.warn('Supabase signOut best-effort failed:', e);
  }
}

