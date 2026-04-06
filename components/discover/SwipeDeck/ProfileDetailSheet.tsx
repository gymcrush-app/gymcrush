import { ProfileInfoBox } from '@/components/profile/ProfileInfoBox';
import { ProfileLifestyleBox } from '@/components/profile/ProfileLifestyleBox';
import { PromptItem } from '@/components/profile/PromptItem';
import { formatDistanceKmRounded } from '@/lib/utils/distance';
import { formatIntents } from '@/lib/utils/formatting';
import { colors, spacing } from '@/theme';
import { Profile } from '@/types';
import { Intent } from '@/types/onboarding';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { RefObject, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

interface ProfileDetailSheetProps {
  profile: Profile | null;
  profileGym: { city?: string; [key: string]: any } | null | undefined;
  distance: number | null;
  prompts: Array<{ id: string; title: string; answer: string }>;
  onPromptPress: (title: string, answer: string) => void;
  bottomSheetRef: RefObject<BottomSheetModal | null>;
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

  const age = profile.age ?? null;

  const prompt1 = prompts[0] ?? null;
  const prompt2 = prompts[1] ?? null;
  const prompt3 = prompts[2] ?? null;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
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

          {/* 1. Top prompt */}
          {prompt1 && (
            <PromptItem
              title={prompt1.title}
              answer={prompt1.answer}
              onPress={() => onPromptPress(prompt1.title, prompt1.answer)}
              highlighted
            />
          )}

          {/* 2. Info box */}
          <ProfileInfoBox
            height={height}
            intent={formattedIntents}
            occupation={profile.occupation ?? null}
            city={profileGym?.city ?? null}
          />

          {/* 3. Prompt 2 */}
          {prompt2 && (
            <PromptItem
              title={prompt2.title}
              answer={prompt2.answer}
              onPress={() => onPromptPress(prompt2.title, prompt2.answer)}
              highlighted
            />
          )}

          {/* 5. Lifestyle info box */}
          <ProfileLifestyleBox
            religion={(profile as any).religion ?? null}
            alcohol={(profile as any).alcohol ?? null}
            smoking={(profile as any).smoking ?? null}
            marijuana={(profile as any).marijuana ?? null}
            hasKids={(profile as any).has_kids ?? null}
          />

          {/* 6. Prompt 3 */}
          {prompt3 && (
            <PromptItem
              title={prompt3.title}
              answer={prompt3.answer}
              onPress={() => onPromptPress(prompt3.title, prompt3.answer)}
              highlighted
            />
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
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
