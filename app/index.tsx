import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/stores/authStore';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const isLoading = useAuthStore((s) => s.isLoading);
  
  if (isLoading) return null;
  
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!isOnboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)/discover" />;
}
