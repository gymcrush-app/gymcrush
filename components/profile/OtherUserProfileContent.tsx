import { PhotoSection } from "@/components/profile/PhotoSection"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { FitnessBadges } from "@/components/profile/FitnessBadges"
import { ProfileDetailContent } from "@/components/profile/ProfileDetailContent"
import { Text } from "@/components/ui/Text"
import { useGymsByIds } from "@/lib/api/gyms"
import { useProfile, useProfileById } from "@/lib/api/profiles"
import { calculateGymDistance, formatDistanceKmRounded } from "@/lib/utils/distance"
import { formatIntents } from "@/lib/utils/formatting"
import { borderRadius, colors, fontSize, fontWeight, spacing } from "@/theme"
import type { FitnessDiscipline, Intent } from "@/types/onboarding"
import { Gem, X } from "lucide-react-native"
import React, { useCallback, useMemo } from "react"
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

export interface OtherUserProfileContentProps {
  userId: string
  onBack: () => void
  onOpenImageChat?: () => void
}

export function OtherUserProfileContent({
  userId,
  onBack,
  onOpenImageChat,
}: OtherUserProfileContentProps) {
  const insets = useSafeAreaInsets()
  const { data: profile, isLoading, error } = useProfileById(userId)
  const { data: currentUserProfile } = useProfile()

  const gymIds = useMemo(
    () =>
      [
        ...new Set(
          [profile?.home_gym_id, currentUserProfile?.home_gym_id].filter(
            Boolean
          ) as string[]
        ),
      ].sort(),
    [profile?.home_gym_id, currentUserProfile?.home_gym_id]
  )
  const { data: gymsMap } = useGymsByIds(gymIds)
  const profileGym = profile && gymsMap && profile.home_gym_id != null ? gymsMap.get(profile.home_gym_id) : undefined
  const currentUserGym =
    currentUserProfile && gymsMap && currentUserProfile.home_gym_id != null
      ? gymsMap.get(currentUserProfile.home_gym_id)
      : undefined

  const handleOpenImageChat = useCallback(() => {
    (onOpenImageChat ?? onBack)()
  }, [onOpenImageChat, onBack])

  const closeButton = (
    <View style={styles.header}>
      <View style={styles.headerSpacer} />
      <Pressable onPress={onBack} style={styles.closeButton} hitSlop={12}>
        <X size={24} color={colors.foreground} />
      </Pressable>
    </View>
  )

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {closeButton}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    )
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {closeButton}
        <View style={styles.errorContainer}>
          <Text variant="h3" color="destructive">
            Failed to load profile
          </Text>
          <Text
            variant="muted"
            style={{ marginTop: spacing[2], textAlign: "center" }}
          >
            {error instanceof Error ? error.message : "Profile not found."}
          </Text>
        </View>
      </View>
    )
  }

  const distance =
    currentUserGym && profileGym
      ? calculateGymDistance(currentUserGym.location, profileGym.location)
      : null

  const discoveryPrefs = profile.discovery_preferences as any
  const intents = (discoveryPrefs?.intents || []) as Intent[]
  const disciplines = profile.fitness_disciplines as FitnessDiscipline[]

  const formattedIntents = formatIntents(intents)
  const distanceKm = formatDistanceKmRounded(distance)

  const imageHeight = SCREEN_WIDTH * 0.75

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      {closeButton}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <PhotoSection
          photos={profile.photo_urls || []}
          imageHeight={imageHeight}
          onOpenImageChat={handleOpenImageChat}
        />

        <View style={styles.contentSection}>
          <ProfileHeader
            displayName={profile.display_name}
            age={profile.age}
            distanceKm={distanceKm}
            variant="compact"
          />

          {/* Gym Gem badge (e.g. when browsing Gym Gems) */}
          <View style={styles.gymGemRow}>
            <View style={styles.gymGemBadge}>
              <Gem size={16} color={colors.primary} />
              <Text style={styles.gymGemBadgeText}>Gym Gem</Text>
            </View>
          </View>

          <ProfileDetailContent
            height={profile.height ?? null}
            intent={formattedIntents}
            occupation={profile.occupation ?? null}
            city={profileGym?.city ?? null}
            bio={profile.bio || null}
          >
            {disciplines.length > 0 && (
              <View style={styles.badgesSection}>
                <FitnessBadges disciplines={disciplines} />
              </View>
            )}
          </ProfileDetailContent>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    padding: spacing[2],
  },
  scrollView: {
    flex: 1,
  },
  contentSection: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
  },
  gymGemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  gymGemBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    backgroundColor: colors.muted,
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
  },
  gymGemBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  badgesSection: {
    marginTop: spacing[4],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[4],
  },
})
