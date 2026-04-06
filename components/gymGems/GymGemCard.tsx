import { Avatar } from '@/components/ui/Avatar';
import type { ProfileWithScore } from '@/types';
import { Image } from 'expo-image';
import { borderRadius, colors, fontSize, fontWeight, shadows, spacing } from '@/theme';
import { Gem } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { toast } from '@/lib/toast';

/** Total height of the Give Gem button area (padding + margins + minHeight). */
const GEM_BUTTON_TOTAL_HEIGHT =
  spacing[3] * 2 + spacing[2] * 2 + 48; // paddingVertical, marginTop/Bottom, minHeight

const GEM_TOAST_MESSAGE = 'Come back tomorrow for your next gem';

export interface GymGemCardProps {
  item: ProfileWithScore;
  gymName: string | null;
  onPress: (userId: string) => void;
  /** Available height for the entire card (photo + button). */
  cardHeight: number;
  /** Available width for the card. */
  cardWidth?: number;
  /** Whether the current user has their daily gem available. */
  hasGemToday?: boolean;
  /** True if the user already gave their gem to this profile this session. */
  gemGivenToThisUser?: boolean;
  /** Callback when user taps Give Gem (only when hasGemToday and !gemGivenToThisUser). */
  onGiveGem?: (userId: string) => void;
  /** True while the give-gem request is in flight. */
  isGivingGem?: boolean;
}

export const GymGemCard = React.memo(function GymGemCard({
  item,
  gymName,
  onPress,
  cardHeight,
  hasGemToday = false,
  cardWidth,
  gemGivenToThisUser = false,
  onGiveGem,
  isGivingGem = false,
}: GymGemCardProps) {
  const photos = item.photo_urls ?? [];
  const hasPhoto = photos.length > 0;
  const photoHeight = cardHeight - GEM_BUTTON_TOTAL_HEIGHT;

  const gemButtonScale = useSharedValue(1);
  const gemButtonOpacity = useSharedValue(1);
  useEffect(() => {
    if (gemGivenToThisUser) {
      gemButtonScale.value = withSequence(
        withTiming(1.08, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
      gemButtonOpacity.value = withTiming(1);
    }
  }, [gemGivenToThisUser, gemButtonScale, gemButtonOpacity]);

  const gemButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gemButtonScale.value }],
    opacity: gemButtonOpacity.value,
  }));

  const handleGiveGemPress = () => {
    if (gemGivenToThisUser) return;
    if (hasGemToday && onGiveGem) {
      onGiveGem(item.id);
    } else {
      toast({ preset: 'none', title: GEM_TOAST_MESSAGE });
    }
  };

  const isButtonActive = hasGemToday && !gemGivenToThisUser && !isGivingGem;

  return (
    <View style={[styles.card, { height: cardHeight }]}>
      <Pressable
        style={({ pressed }) => [styles.photoPressable, pressed && styles.cardPressed]}
        onPress={() => onPress(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.display_name}'s profile`}
      >
        <View style={[styles.photoWrapper, { height: photoHeight }]}>
          {hasPhoto ? (
            <Image
              source={{ uri: photos[0] }}
              style={{ width: cardWidth ?? '100%', height: photoHeight }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.photoPlaceholder, { height: photoHeight }]}>
              <Avatar uri={null} size="xl" name={item.display_name} />
            </View>
          )}

          {/* Name overlay */}
          <View style={styles.nameOverlay} pointerEvents="none">
            <Text style={styles.nameText} numberOfLines={1}>
              {item.display_name}
              {item.age != null ? `, ${item.age}` : ''}
            </Text>
            <Gem size={20} color={colors.primary} style={styles.gemIcon} />
          </View>

          {gymName ? (
            <View style={styles.bottomBox} pointerEvents="none">
              <Text style={styles.bottomLabel}>Home gym</Text>
              <Text style={styles.bottomValue} numberOfLines={1}>{gymName}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Give Gem button – separate Pressable so card tap doesn't fire when tapping button */}
      <Pressable
        onPress={handleGiveGemPress}
        disabled={isGivingGem}
        style={({ pressed }) => [
          styles.gemButton,
          isButtonActive && styles.gemButtonActive,
          gemGivenToThisUser && styles.gemButtonGiven,
          (!hasGemToday && !gemGivenToThisUser) && styles.gemButtonSpent,
          pressed && styles.gemButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={gemGivenToThisUser ? 'Gem given' : hasGemToday ? 'Give gem' : 'No gem available'}
      >
        <Animated.View style={[styles.gemButtonInner, gemButtonAnimatedStyle]}>
          <Gem size={18} color={gemGivenToThisUser ? colors.primary : (hasGemToday ? colors.primaryForeground : colors.mutedForeground)} />
          <Text
            style={[
              styles.gemButtonText,
              gemGivenToThisUser && styles.gemButtonTextGiven,
              (!hasGemToday && !gemGivenToThisUser) && styles.gemButtonTextSpent,
            ]}
          >
            {gemGivenToThisUser ? 'Gem Given ✦' : isGivingGem ? 'Sending…' : '✦ Give Gem'}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadows.card,
  },
  photoPressable: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.95,
  },
  gemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[2],
    borderRadius: borderRadius.xl,
    minHeight: 48,
  },
  gemButtonActive: {
    backgroundColor: colors.primary,
  },
  gemButtonGiven: {
    backgroundColor: colors.muted,
  },
  gemButtonSpent: {
    backgroundColor: colors.muted,
    opacity: 0.7,
  },
  gemButtonPressed: {
    opacity: 0.9,
  },
  gemButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  gemButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
  gemButtonTextGiven: {
    color: colors.primary,
  },
  gemButtonTextSpent: {
    color: colors.mutedForeground,
  },
  photoWrapper: {
    position: 'relative',
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  photoPlaceholder: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[6],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  nameText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    flex: 1,
  },
  gemIcon: {
    marginLeft: spacing[2],
  },
  bottomBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card + 'E6',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  bottomLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing[0.5],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
});
