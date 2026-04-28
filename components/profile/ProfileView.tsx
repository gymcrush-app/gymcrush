import { ProfileInfoBox } from '@/components/profile/ProfileInfoBox';
import { ProfileLifestyleBox } from '@/components/profile/ProfileLifestyleBox';
import { FitnessBadges } from '@/components/profile/FitnessBadges';
import { PhotoCarousel } from '@/components/profile/PhotoCarousel';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';

import { Text } from '@/components/ui/Text';
import { MERIDIAN_ID_COORDS, VISIBILITY_OPTIONS } from '@/constants';
import { triggerDevLocationRefresh } from '@/lib/devLocationRefresh';
import { formatIntents } from '@/lib/utils/formatting';
import { APP, borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import type { Gym, Profile, Visibility } from '@/types';
import type { FitnessDiscipline, Intent } from '@/types/onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Settings, Trash2 } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { toast } from '@/lib/toast';


interface ProfileViewProps {
  profile: Profile;
  gym?: Gym | null;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onUpdateProfile: (updates: Partial<Profile>) => void;
  isLoggingOut?: boolean;
  isDeletingAccount?: boolean;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  photoContainer: {
    position: 'relative',
  },
  editButtonContainer: {
    position: 'absolute',
    bottom: spacing[4],
    right: spacing[4],
  },
  profileInfoContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  nameText: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.manropeBold,
  },
  gymSubtext: {
    marginTop: spacing[1],
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
    backgroundColor: colors.primary + '1A', // 10% opacity
  },
  visibilityOptionLabel: {
    fontFamily: fontFamily.manropeMedium,
    fontSize: fontSize.sm,
  },
  visibilityOptionDescription: {
    marginTop: spacing[1],
  },
  settingsSection: {
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[2],
  },
  settingsItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    justifyContent: 'flex-start',
  },
  logoutText: {
    color: colors.destructive,
    fontFamily: fontFamily.manropeSemibold,
  },
  deleteItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    justifyContent: 'flex-start',
    marginTop: spacing[2],
  },
  deleteText: {
    color: colors.mutedForeground,
    fontFamily: fontFamily.manropeMedium,
  },
  devSection: {
    marginTop: spacing[6],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[2],
  },
  devSectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeMedium,
    color: colors.mutedForeground,
    marginBottom: spacing[2],
  },
});

export function ProfileView({ profile, gym, onLogout, onDeleteAccount, onUpdateProfile, isLoggingOut, isDeletingAccount }: ProfileViewProps) {
  const router = useRouter();

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const photoHeight = SCREEN_WIDTH * (3 / 4);

  // Map Profile to display format
  const photos = profile.photo_urls || [];
  const name = profile.display_name;
  const age = profile.age;
  const visibility: Visibility = profile.is_visible ? 'visible' : 'paused';


  const discoveryPrefs = profile.discovery_preferences as { intents?: Intent[] } | null | undefined;
  const intents = (discoveryPrefs?.intents ?? []) as Intent[];
  const formattedIntents = formatIntents(intents);
  const disciplines = (profile.fitness_disciplines ?? []) as FitnessDiscipline[];

  const handleVisibilityChange = (newVisibility: Visibility) => {
    // Map visibility back to is_visible boolean
    const isVisible = newVisibility === 'visible';
    onUpdateProfile({ is_visible: isVisible });
  };



  const handleSetLocationMeridian = async () => {
    try {
      await AsyncStorage.setItem(
        APP.STORAGE_KEYS.DEV_LOCATION_OVERRIDE,
        JSON.stringify(MERIDIAN_ID_COORDS)
      );
      triggerDevLocationRefresh();
    } catch (e) {
      console.warn('Failed to set dev location override:', e);
      toast({ preset: 'error', title: 'Failed to set location' });
    }
  };

  const handleClearLocationOverride = async () => {
    try {
      await AsyncStorage.removeItem(APP.STORAGE_KEYS.DEV_LOCATION_OVERRIDE);
      triggerDevLocationRefresh();
    } catch (e) {
      console.warn('Failed to clear dev location override:', e);
      toast({ preset: 'error', title: 'Failed to clear location' });
    }
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={{ paddingBottom: spacing[24] }}
    >
      {/* Photo carousel */}
      <View style={[styles.photoContainer, { height: photoHeight, backgroundColor: colors.muted }]}>
        {photos.length === 0 ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.muted }]} />
        ) : (
          <PhotoCarousel photos={photos} height={photoHeight} width={SCREEN_WIDTH} />
        )}

        {/* Edit button */}
        <View style={styles.editButtonContainer}>
          <Button
            variant="outline"
            size="sm"
            style={{
              backgroundColor: `${colors.card}E6`, // ~90% opacity
            }}
            onPress={() => router.push('/(tabs)/profile/edit')}
          >
            Edit Profile
          </Button>
        </View>
      </View>

      {/* Profile info */}
      <View style={[styles.profileInfoContainer, { gap: spacing[6] }]}>
        <View>
          <Text variant="h1" style={styles.nameText}>
            {name}, {age}
          </Text>
          {gym && (
            <Text variant="mutedSmall" color="muted" style={styles.gymSubtext}>
              {gym.name}
            </Text>
          )}
        </View>

        <ProfileInfoBox
          height={profile.height ?? null}
          intent={formattedIntents}
          occupation={profile.occupation ?? null}
          city={gym?.city ?? null}
        />


        <ProfileLifestyleBox
          ethnicity={Array.isArray((profile as any).ethnicity) ? (profile as any).ethnicity : null}
          religion={(profile as any).religion ?? null}
          alcohol={(profile as any).alcohol ?? null}
          smoking={(profile as any).smoking ?? null}
          marijuana={(profile as any).marijuana ?? null}
          hasKids={(profile as any).has_kids ?? null}
        />

        {disciplines.length > 0 && (
          <View>
            <FitnessBadges disciplines={disciplines} />
          </View>
        )}

        {/* Visibility */}
        <View style={styles.visibilitySection}>
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


        {/* Settings section */}
        <View style={styles.settingsSection}>
          <Pressable
            style={styles.settingsItem}
            onPress={() => router.push('/(tabs)/profile/settings')}
          >
            <View style={[styles.settingsItemContent, { gap: spacing[3] }]}>
              <Settings size={20} color={colors.mutedForeground} />
              <Text weight="medium">Settings</Text>
            </View>
            <ChevronRight size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={onLogout}
            disabled={!!isLoggingOut}
            style={styles.logoutItem}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.destructive} style={{ marginRight: spacing[3] }} />
            ) : (
              <LogOut size={20} color={colors.destructive} style={{ marginRight: spacing[3] }} />
            )}
            <Text style={styles.logoutText}>{isLoggingOut ? 'Logging out…' : 'Log Out'}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
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
                          { text: 'Delete Forever', style: 'destructive', onPress: onDeleteAccount },
                        ],
                      );
                    },
                  },
                ],
              );
            }}
            disabled={!!isDeletingAccount}
            style={styles.deleteItem}
          >
            {isDeletingAccount ? (
              <ActivityIndicator size="small" color={colors.destructive} style={{ marginRight: spacing[3] }} />
            ) : (
              <Trash2 size={20} color={colors.mutedForeground} style={{ marginRight: spacing[3] }} />
            )}
            <Text style={styles.deleteText}>{isDeletingAccount ? 'Deleting account…' : 'Delete Account'}</Text>
          </Pressable>

          {__DEV__ && (
            <View style={styles.devSection}>
              <Text style={styles.devSectionTitle}>Developer</Text>
              <Button variant="outline" size="sm" onPress={handleSetLocationMeridian}>
                Set location to Meridian, ID
              </Button>
              <Button variant="outline" size="sm" onPress={handleClearLocationOverride}>
                Clear location override
              </Button>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
