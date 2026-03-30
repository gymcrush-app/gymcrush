import { AboutSection } from '@/components/profile/AboutSection';
import { ProfileInfoBox } from '@/components/profile/ProfileInfoBox';
import { FitnessBadges } from '@/components/profile/FitnessBadges';
import { PhotoCarousel } from '@/components/profile/PhotoCarousel';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { MERIDIAN_ID_COORDS, VISIBILITY_OPTIONS } from '@/constants';
import { triggerDevLocationRefresh } from '@/lib/devLocationRefresh';
import { formatIntents } from '@/lib/utils/formatting';
import { APP, borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { Gym, Profile, Visibility } from '@/types';
import type { FitnessDiscipline, Intent } from '@/types/onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Settings } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { toast } from '@/lib/toast';

const DEFAULT_APPROACH_PROMPT = "I'm open to being approached at the gym";

interface ProfileViewProps {
  profile: Profile;
  gym?: Gym | null;
  onLogout: () => void;
  onUpdateProfile: (updates: Partial<Profile>) => void;
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
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
  },
  visibilityOptionDescription: {
    marginTop: spacing[1],
  },
  approachSection: {
    gap: spacing[3],
  },
  approachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  approachTextContainer: {
    flex: 1,
    marginRight: spacing[4],
  },
  approachDescription: {
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
    fontWeight: fontWeight.semibold,
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
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
    marginBottom: spacing[2],
  },
});

export function ProfileView({ profile, gym, onLogout, onUpdateProfile }: ProfileViewProps) {
  const router = useRouter();

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const photoHeight = SCREEN_WIDTH * (3 / 4);

  // Map Profile to display format
  const photos = profile.photo_urls || [];
  const name = profile.display_name;
  const age = profile.age;
  const visibility: Visibility = profile.is_visible ? 'visible' : 'paused';
  const openToApproach = !!profile.approach_prompt;

  const discoveryPrefs = profile.discovery_preferences as { intents?: Intent[] } | null | undefined;
  const intents = (discoveryPrefs?.intents ?? []) as Intent[];
  const formattedIntents = formatIntents(intents);
  const disciplines = (profile.fitness_disciplines ?? []) as FitnessDiscipline[];

  const handleVisibilityChange = (newVisibility: Visibility) => {
    // Map visibility back to is_visible boolean
    const isVisible = newVisibility === 'visible';
    onUpdateProfile({ is_visible: isVisible });
  };

  const handleOpenToApproachChange = (checked: boolean) => {
    if (checked) {
      onUpdateProfile({ approach_prompt: DEFAULT_APPROACH_PROMPT });
    } else {
      onUpdateProfile({ approach_prompt: null });
    }
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

        <AboutSection bio={profile.bio ?? null} />

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

        {/* Open to Approach */}
        <View style={styles.approachSection}>
          <View style={styles.approachHeader}>
            <View style={styles.approachTextContainer}>
              <Label>Open to being approached</Label>
              <Text variant="mutedSmall" style={styles.approachDescription}>
                Let others know you{"'"}re comfortable being approached in person at the gym
              </Text>
            </View>
            <Switch
              value={openToApproach}
              onValueChange={handleOpenToApproachChange}
            />
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
            style={styles.logoutItem}
          >
            <LogOut size={20} color={colors.destructive} style={{ marginRight: spacing[3] }} />
            <Text style={styles.logoutText}>Log Out</Text>
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
