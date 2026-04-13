import { ProfileView } from '@/components/profile/ProfileView';
import { Text } from '@/components/ui/Text';
import { useSignOut } from '@/lib/api/auth';
import { useGymById } from '@/lib/api/gyms';
import { useProfile, useUpdateProfile } from '@/lib/api/profiles';
import { colors, spacing } from '@/theme';
import { toast } from '@/lib/toast';
import type { Profile } from '@/types';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();

  // Fetch gym data if profile has a home_gym_id
  const { data: gym, isLoading: gymLoading } = useGymById(profile?.home_gym_id || '');

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    try {
      await updateProfile.mutateAsync(updates);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({ 
        preset: 'error', 
        title: 'Update failed',
        message: 'Failed to update your profile. Please try again.',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
      // The AuthStateChangeHandler in _layout.tsx will handle redirecting to login
    } catch (error) {
      console.error('Failed to sign out:', error);
      toast({ 
        preset: 'error',
        title: 'Logout failed',
        message: 'Failed to sign out. Please try again.',
      });
    }
  };

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
      <ProfileView
        profile={profile}
        gym={gym || null}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
        isLoggingOut={signOut.isPending}
      />
    </SafeAreaView>
  );
}
