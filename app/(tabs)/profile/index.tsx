import { ProfileView } from '@/components/profile/ProfileView';
import { Text } from '@/components/ui/Text';
import { useGymById } from '@/lib/api/gyms';
import { useProfile } from '@/lib/api/profiles';
import { colors, spacing } from '@/theme';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();

  // Fetch gym data if profile has a home_gym_id
  const { data: gym, isLoading: gymLoading } = useGymById(profile?.home_gym_id || '');

  // Loading state
  if (profileLoading || gymLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (profileError || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text variant="h3" color="destructive">
            Failed to load profile
          </Text>
          <Text variant="muted" style={{ marginTop: spacing[2], textAlign: 'center' }}>
            {profileError ? 'An error occurred while loading your profile.' : 'Profile not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success state - render ProfileView
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ProfileView profile={profile} gym={gym || null} />
    </SafeAreaView>
  );
}
