import {
  DISCOVER_PHOTO_WIDTH,
  PHOTO_INSET,
  PhotoSection,
} from '@/components/profile/PhotoSection';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileInfoBox } from '@/components/profile/ProfileInfoBox';
import { ProfileLifestyleBox } from '@/components/profile/ProfileLifestyleBox';
import { PromptItem } from '@/components/profile/PromptItem';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { MERIDIAN_ID_COORDS } from '@/constants';
import { useProfilePrompts } from '@/lib/api/prompts';
import { triggerDevLocationRefresh } from '@/lib/devLocationRefresh';
import { toast } from '@/lib/toast';
import { formatIntents } from '@/lib/utils/formatting';
import { APP, borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import type { Gym, Profile } from '@/types';
import type { Intent } from '@/types/onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface ProfileViewProps {
  profile: Profile;
  gym?: Gym | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IDEAL_IMAGE_HEIGHT = SCREEN_WIDTH * (1350 / 1080) - 30;

export function ProfileView({ profile, gym }: ProfileViewProps) {
  const router = useRouter();
  const { data: profilePrompts } = useProfilePrompts(profile.id);

  const discoveryPrefs = profile.discovery_preferences as { intents?: Intent[] } | null | undefined;
  const intents = (discoveryPrefs?.intents ?? []) as Intent[];
  const formattedIntents = formatIntents(intents);

  const { prompt1, prompt2, prompt3 } = useMemo(() => {
    if (!profilePrompts || profilePrompts.length === 0) {
      return { prompt1: null, prompt2: null, prompt3: null };
    }
    const sorted = [...profilePrompts].sort(
      (a, b) => b.engagement_count - a.engagement_count,
    );
    return {
      prompt1: sorted[0] ?? null,
      prompt2: sorted[1] ?? null,
      prompt3: sorted[2] ?? null,
    };
  }, [profilePrompts]);

  const handleSetLocationMeridian = async () => {
    try {
      await AsyncStorage.setItem(
        APP.STORAGE_KEYS.DEV_LOCATION_OVERRIDE,
        JSON.stringify(MERIDIAN_ID_COORDS),
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

  // Stabilize the photos array reference across profile refetches that return
  // identical URL strings. Without this, every refetch produces a new array
  // and the PhotoCarousel re-renders even when nothing visible changed.
  const photos = useMemo(
    () => profile.photo_urls || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [(profile.photo_urls || []).join('|')],
  );
  const noop = () => {};

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        {/* Name row — mirrors discover compact header */}
        <View style={styles.nameRow}>
          <ProfileHeader
            displayName={profile.display_name}
            age={profile.age}
            distanceKm={null}
            variant="compact"
          />
        </View>

        {/* Photo */}
        <View style={[styles.photoWrapper, { height: IDEAL_IMAGE_HEIGHT }]}>
          <PhotoSection
            photos={photos}
            imageHeight={IDEAL_IMAGE_HEIGHT}
            photoWidth={DISCOVER_PHOTO_WIDTH}
            showChatBubble={false}
          />

          {/* Settings gear */}
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/profile/settings')}
            hitSlop={8}
          >
            <Settings size={20} color={colors.foreground} />
          </Pressable>

          {/* Edit profile */}
          <View style={styles.editButtonContainer}>
            <Button
              variant="outline"
              size="sm"
              style={{ backgroundColor: `${colors.card}E6` }}
              onPress={() => router.push('/(tabs)/profile/edit')}
            >
              Edit Profile
            </Button>
          </View>
        </View>

        {/* Interleaved prompts + info — mirrors discover */}
        <View style={styles.profileDetailSection}>
          {prompt1 && (
            <PromptItem
              title={prompt1.prompt_text}
              answer={prompt1.answer}
              onPress={noop}
              highlighted
              showMessageButton={false}
            />
          )}

          <ProfileInfoBox
            height={profile.height ?? null}
            intent={formattedIntents}
            occupation={profile.occupation ?? null}
            city={gym?.city ?? null}
          />

          {prompt2 && (
            <PromptItem
              title={prompt2.prompt_text}
              answer={prompt2.answer}
              onPress={noop}
              highlighted
              showMessageButton={false}
            />
          )}

          <ProfileLifestyleBox
            ethnicity={Array.isArray((profile as any).ethnicity) ? (profile as any).ethnicity : null}
            religion={(profile as any).religion ?? null}
            alcohol={(profile as any).alcohol ?? null}
            smoking={(profile as any).smoking ?? null}
            marijuana={(profile as any).marijuana ?? null}
            hasKids={(profile as any).has_kids ?? null}
          />

          {prompt3 && (
            <PromptItem
              title={prompt3.prompt_text}
              answer={prompt3.answer}
              onPress={noop}
              highlighted
              showMessageButton={false}
            />
          )}

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

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing[24],
  },
  card: {
    flex: 1,
    backgroundColor: '#000000',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  nameRow: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[1],
    paddingBottom: spacing[1],
  },
  photoWrapper: {
    position: 'relative',
    width: SCREEN_WIDTH,
  },
  settingsButton: {
    position: 'absolute',
    top: spacing[4],
    right: PHOTO_INSET + spacing[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.card}E6`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonContainer: {
    position: 'absolute',
    bottom: spacing[4],
    right: PHOTO_INSET + spacing[4],
  },
  profileDetailSection: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[4],
  },
  devSection: {
    marginTop: spacing[4],
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
