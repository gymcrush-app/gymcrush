import { ProfileDetailContent } from '@/components/profile/ProfileDetailContent';
import { PromptsList } from '@/components/profile/PromptsList';
import { formatDistanceKmRounded } from '@/lib/utils/distance';
import { formatIntents } from '@/lib/utils/formatting';
import { colors, spacing } from '@/theme';
import { Profile } from '@/types';
import { Intent } from '@/types/onboarding';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { RefObject, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

interface ProfileDetailSheetProps {
  profile: Profile | null;
  profileGym: { city?: string; [key: string]: any } | null | undefined;
  distance: number | null;
  prompts: Array<{ id: string; title: string; answer: string }>;
  onPromptPress: (title: string, answer: string) => void;
  bottomSheetRef: RefObject<BottomSheet | null>;
}

const renderBackdrop = (props: any) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.5}
  />
);

export function ProfileDetailSheet({
  profile,
  profileGym,
  distance,
  prompts,
  onPromptPress,
  bottomSheetRef,
}: ProfileDetailSheetProps) {
  const snapPoints = useMemo(() => ['75%', '95%'], []);

  if (!profile) return null;

  const discoveryPrefs = profile.discovery_preferences as any;
  const intents = (discoveryPrefs?.intents || []) as Intent[];
  const height = profile.height ?? discoveryPrefs?.height ?? null;
  const formattedIntents = formatIntents(intents);
  const distanceKm = formatDistanceKmRounded(distance);

  const age = profile.age ?? null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
      enablePanDownToClose
    >
      <BottomSheetScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text variant="h2">
            {profile.display_name}{age != null ? `, ${age}` : ''}
          </Text>

          <ProfileDetailContent
            height={height}
            intent={formattedIntents}
            occupation={profile.occupation ?? null}
            city={profileGym?.city ?? null}
            bio={profile.bio ?? null}
          />

          <PromptsList prompts={prompts} onPromptPress={onPromptPress} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.card,
  },
  indicator: {
    backgroundColor: colors.muted,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
});
