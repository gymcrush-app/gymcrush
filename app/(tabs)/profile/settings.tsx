import { PermissionPrompt } from '@/components/notifications/PermissionPrompt';
import { Label } from '@/components/ui/Label';
import { Text } from '@/components/ui/Text';
import { VISIBILITY_OPTIONS } from '@/constants';
import { useNotifications } from '@/hooks/useNotifications';
import { useSignOut } from '@/lib/api/auth';
import { useProfile, useUpdateProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { track } from '@/lib/utils/analytics';
import { signOutAndReset } from '@/lib/utils/signOut';
import { borderRadius, colors, fontFamily, fontSize, spacing } from '@/theme';
import type { Visibility } from '@/types';
import { useRouter } from 'expo-router';
import { ChevronLeft, LogOut, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { permissionStatus, requestPermissionAndRegister, isRegistering } = useNotifications();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const visibility: Visibility = profile?.is_visible ? 'visible' : 'paused';

  const handleVisibilityChange = (newVisibility: Visibility) => {
    updateProfile.mutate({ is_visible: newVisibility === 'visible' });
  };

  const handleLogout = async () => {
    try {
      await signOut.mutateAsync();
    } catch (error) {
      console.error('Failed to sign out:', error);
      toast({
        preset: 'error',
        title: 'Logout failed',
        message: 'Failed to sign out. Please try again.',
      });
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error('Delete failed');

      track('account_deleted');
      await signOutAndReset();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast({
        preset: 'error',
        title: 'Delete failed',
        message: error?.message ?? 'Failed to delete your account. Please try again.',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your profile, matches, messages, and photos. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Last chance — all your GymCrush data will be gone forever.',
              [
                { text: 'Keep My Account', style: 'cancel' },
                { text: 'Delete Forever', style: 'destructive', onPress: handleDeleteAccount },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {permissionStatus !== 'granted' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <Text style={styles.sectionHint}>Get alerts for new GymCrushes and messages</Text>
            <PermissionPrompt
              onRequestPermission={requestPermissionAndRegister}
              ctaLabel={isRegistering ? 'Enabling…' : 'Enable notifications'}
            />
          </View>
        ) : null}

        <View style={[styles.section, styles.visibilitySection]}>
          <Label>Profile Visibility</Label>
          <View style={styles.visibilityOptionsContainer}>
            {VISIBILITY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleVisibilityChange(option.value)}
                style={[
                  styles.visibilityOption,
                  visibility === option.value && styles.visibilityOptionSelected,
                ]}
              >
                <Text style={styles.visibilityOptionLabel}>{option.label}</Text>
                <Text variant="mutedSmall" style={styles.visibilityOptionDescription}>
                  {option.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery preferences</Text>
          <Text style={styles.sectionHint}>
            Gender, age range, distance, and Gym Crush Mode are in Discover — tap the settings icon on the Discover tab.
          </Text>
          <Pressable
            style={styles.linkRow}
            onPress={() => router.push('/(tabs)/discover')}
          >
            <Text style={styles.linkRowText}>Go to Discover</Text>
          </Pressable>
        </View>

        <View style={styles.accountSection}>
          <Pressable
            onPress={handleLogout}
            disabled={signOut.isPending}
            style={styles.actionRow}
          >
            {signOut.isPending ? (
              <ActivityIndicator size="small" color={colors.destructive} style={styles.actionIcon} />
            ) : (
              <LogOut size={20} color={colors.destructive} style={styles.actionIcon} />
            )}
            <Text style={styles.logoutText}>{signOut.isPending ? 'Logging out…' : 'Log Out'}</Text>
          </Pressable>

          <Pressable
            onPress={confirmDeleteAccount}
            disabled={isDeletingAccount}
            style={styles.actionRow}
          >
            {isDeletingAccount ? (
              <ActivityIndicator size="small" color={colors.destructive} style={styles.actionIcon} />
            ) : (
              <Trash2 size={20} color={colors.mutedForeground} style={styles.actionIcon} />
            )}
            <Text style={styles.deleteText}>{isDeletingAccount ? 'Deleting account…' : 'Delete Account'}</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.demoPlaygroundRow}
          onPress={() => router.push('/(tabs)/profile/playground')}
        >
          <View style={styles.demoPlaygroundRowContent}>
            <Text style={styles.demoPlaygroundRowTitle}>Demo playground</Text>
            <Text style={styles.demoPlaygroundRowHint}>
              Test haptics and swipe transitions
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  sectionHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[3],
  },
  linkRow: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[2],
  },
  linkRowText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.primary,
  },
  visibilitySection: {
    gap: spacing[3],
  },
  visibilityOptionsContainer: {
    gap: spacing[2],
  },
  visibilityOption: {
    width: '100%',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  visibilityOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '1A',
  },
  visibilityOptionLabel: {
    fontFamily: fontFamily.manropeMedium,
    fontSize: fontSize.sm,
  },
  visibilityOptionDescription: {
    marginTop: spacing[1],
  },
  accountSection: {
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
  },
  actionIcon: {
    marginRight: spacing[3],
  },
  logoutText: {
    color: colors.destructive,
    fontFamily: fontFamily.manropeSemibold,
  },
  deleteText: {
    color: colors.mutedForeground,
    fontFamily: fontFamily.manropeMedium,
  },
  demoPlaygroundRow: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  demoPlaygroundRowContent: {
    gap: spacing[1],
  },
  demoPlaygroundRowTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
  },
  demoPlaygroundRowHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});
