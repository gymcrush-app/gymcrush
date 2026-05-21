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
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  LogOut,
  RotateCcw,
  ShieldOff,
  Star,
  Trash2,
  Users,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Purchases from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIVACY_URL = 'https://gymcrush.com/privacy';
const TERMS_URL = 'https://gymcrush.com/terms';
const COOKIE_POLICY_URL = 'https://gymcrush.com/cookie-policy';
const COMMUNITY_GUIDELINES_URL = 'https://gymcrush.com/community-guidelines';
const SUPPORT_EMAIL = 'support@gymcrush.com';
const APP_STORE_ID = '6762858426';
const ANDROID_PACKAGE = 'com.gymcrush.app';
const APP_STORE_REVIEW_URL = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;
const PLAY_STORE_REVIEW_URL = `market://details?id=${ANDROID_PACKAGE}`;
const IOS_MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const ANDROID_MANAGE_SUBSCRIPTIONS_URL = `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE}`;

interface SettingsLinkRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

function SettingsLinkRow({ icon, label, onPress, loading, disabled }: SettingsLinkRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.linkItem, pressed && styles.linkItemPressed]}
    >
      <View style={styles.linkItemIcon}>{icon}</View>
      <Text style={styles.linkItemLabel}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      ) : (
        <ChevronRight size={18} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { permissionStatus, requestPermissionAndRegister, isRegistering } = useNotifications();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const buildNumber = Platform.select({
    ios: Constants.expoConfig?.ios?.buildNumber,
    android: String(Constants.expoConfig?.android?.versionCode ?? ''),
  });

  const openURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Cannot open URL');
      await Linking.openURL(url);
    } catch {
      toast({
        preset: 'error',
        title: 'Could not open link',
        message: 'Please try again later.',
      });
    }
  };

  const handleManageSubscription = () => {
    openURL(
      Platform.OS === 'ios'
        ? IOS_MANAGE_SUBSCRIPTIONS_URL
        : ANDROID_MANAGE_SUBSCRIPTIONS_URL,
    );
  };

  const handleRestorePurchases = async () => {
    setIsRestoringPurchases(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasActive = Object.keys(customerInfo.entitlements.active ?? {}).length > 0;
      track('purchases_restored', { had_active_entitlement: hasActive });
      Alert.alert(
        hasActive ? 'Purchases restored' : 'No purchases to restore',
        hasActive
          ? 'Your subscription has been restored.'
          : 'We couldn’t find any active purchases on this Apple ID.',
      );
    } catch (error: any) {
      toast({
        preset: 'error',
        title: 'Restore failed',
        message: error?.message ?? 'Please try again.',
      });
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  const handleRateApp = () => {
    openURL(Platform.OS === 'ios' ? APP_STORE_REVIEW_URL : PLAY_STORE_REVIEW_URL);
  };

  const handleHelpSupport = () => {
    const subject = encodeURIComponent('GymCrush support');
    openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  };

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
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.linkGroup}>
            <SettingsLinkRow
              icon={<CreditCard size={18} color={colors.foreground} />}
              label="Manage Subscription"
              onPress={handleManageSubscription}
            />
            <SettingsLinkRow
              icon={<RotateCcw size={18} color={colors.foreground} />}
              label="Restore Purchases"
              onPress={handleRestorePurchases}
              loading={isRestoringPurchases}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety</Text>
          <View style={styles.linkGroup}>
            <SettingsLinkRow
              icon={<ShieldOff size={18} color={colors.foreground} />}
              label="Blocked Users"
              onPress={() =>
                router.push('/(tabs)/profile/blocked-users' as never)
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.linkGroup}>
            <SettingsLinkRow
              icon={<FileText size={18} color={colors.foreground} />}
              label="Privacy Policy"
              onPress={() => openURL(PRIVACY_URL)}
            />
            <SettingsLinkRow
              icon={<FileText size={18} color={colors.foreground} />}
              label="Terms of Service"
              onPress={() => openURL(TERMS_URL)}
            />
            <SettingsLinkRow
              icon={<FileText size={18} color={colors.foreground} />}
              label="Cookie Policy"
              onPress={() => openURL(COOKIE_POLICY_URL)}
            />
            <SettingsLinkRow
              icon={<Users size={18} color={colors.foreground} />}
              label="Community Guidelines"
              onPress={() => openURL(COMMUNITY_GUIDELINES_URL)}
            />
            <SettingsLinkRow
              icon={<HelpCircle size={18} color={colors.foreground} />}
              label="Help & Support"
              onPress={handleHelpSupport}
            />
            <SettingsLinkRow
              icon={<Star size={18} color={colors.foreground} />}
              label="Rate GymCrush"
              onPress={handleRateApp}
            />
          </View>
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

        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>
            GymCrush {appVersion}
            {buildNumber ? ` (${buildNumber})` : ''}
          </Text>
        </View>
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
  linkGroup: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  linkItemPressed: {
    backgroundColor: colors.muted,
  },
  linkItemIcon: {
    width: 22,
    alignItems: 'center',
  },
  linkItemLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeMedium,
    color: colors.foreground,
  },
  versionFooter: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  versionText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
});
