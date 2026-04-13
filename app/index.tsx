import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/stores/authStore';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { Text } from '@/components/ui/Text';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const authResolved = useAuthStore((s) => s.authResolved);
  
  if (!hasHydrated || !authResolved || isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="mutedSmall" color="muted">
            Loading…
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!isOnboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)/discover" />;
}
