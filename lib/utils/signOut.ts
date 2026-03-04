import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';

export async function signOutAndReset() {
  const { clearSession } = useAuthStore.getState();

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }

  clearSession();
  useOnboardingStore.getState().clearData();
}

