import { PhotoSection } from "@/components/profile/PhotoSection"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { ProfileInfoBox } from "@/components/profile/ProfileInfoBox"
import { FitnessBadges } from "@/components/profile/FitnessBadges"
import { ProfileLifestyleBox } from "@/components/profile/ProfileLifestyleBox"
import { PromptItem } from "@/components/profile/PromptItem"
import { Text } from "@/components/ui/Text"
import { useDailyGem, useGiveGymGem } from "@/lib/api/gemGifts"
import { useGymsByIds } from "@/lib/api/gyms"
import { useProfile, useProfileById } from "@/lib/api/profiles"
import { useProfilePrompts } from "@/lib/api/prompts"
import { toast } from "@/lib/toast"
import { calculateGymDistance, formatDistanceKmRounded } from "@/lib/utils/distance"
import { formatIntents } from "@/lib/utils/formatting"
import { borderRadius, colors, fontSize, fontFamily, spacing } from "@/theme"
import type { FitnessDiscipline, Intent } from "@/types/onboarding"
import type { UserProfileModalMode } from "@/lib/contexts/UserProfileModalContext"
import MaskedView from "@react-native-masked-view/masked-view"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { Gem, X } from "lucide-react-native"
import React, { useCallback, useMemo, useState } from "react"
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

const ACTION_BAR_HEIGHT = 96

export interface OtherUserProfileContentProps {
  userId: string
  onBack: () => void
  onOpenImageChat?: () => void
  mode?: UserProfileModalMode
}

export function OtherUserProfileContent({
  userId,
  onBack,
  onOpenImageChat,
  mode = "default",
}: OtherUserProfileContentProps) {
  const insets = useSafeAreaInsets()
  const { data: profile, isLoading, error } = useProfileById(userId)
  const { data: currentUserProfile } = useProfile()

  const isGymGem = mode === "gym-gem"

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

  const { data: profilePrompts } = useProfilePrompts(userId)

  const prompts = useMemo(() => {
    if (!profilePrompts) return []
    return profilePrompts.map((pp) => ({
      id: pp.id,
      title: pp.prompt_text.toUpperCase(),
      answer: pp.answer,
      engagement_count: pp.engagement_count,
    }))
  }, [profilePrompts])

  const { prompt1, prompt2, prompt3 } = useMemo(() => {
    if (prompts.length === 0) return { prompt1: null, prompt2: null, prompt3: null }
    const sorted = [...prompts].sort((a, b) => b.engagement_count - a.engagement_count)
    return {
      prompt1: sorted[0] ?? null,
      prompt2: sorted[1] ?? null,
      prompt3: sorted[2] ?? null,
    }
  }, [prompts])

  // No-op for prompt press in this view (no message sheet)
  const handlePromptPress = useCallback((_title: string, _answer: string) => {}, [])

  const handleOpenImageChat = useCallback(() => {
    (onOpenImageChat ?? onBack)()
  }, [onOpenImageChat, onBack])

  const { hasGemToday } = useDailyGem()
  const giveGemMutation = useGiveGymGem()
  const [isGivingGem, setIsGivingGem] = useState(false)
  const [gemGiven, setGemGiven] = useState(false)

  const handleGiveGem = useCallback(async () => {
    if (!isGymGem || gemGiven || isGivingGem) return
    if (!hasGemToday) {
      toast({ preset: "none", title: "Come back tomorrow for your next gem" })
      return
    }
    setIsGivingGem(true)
    try {
      const result = await giveGemMutation.mutateAsync({ toUserId: userId })
      if (!result.ok && result.error) {
        toast({
          preset: "error",
          title:
            result.error === "no_gem_available" ? "No gem left today" : result.error,
        })
      } else {
        setGemGiven(true)
        setTimeout(() => onBack(), 600)
      }
    } catch (err: any) {
      toast({
        preset: "error",
        title: "Failed to send gem",
        message: err?.message || "Please try again.",
      })
    } finally {
      setIsGivingGem(false)
    }
  }, [isGymGem, gemGiven, isGivingGem, hasGemToday, giveGemMutation, userId, onBack])

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

  const imageHeight = SCREEN_WIDTH * (1350 / 1080) - 30

  const scrollBottomPad = isGymGem ? ACTION_BAR_HEIGHT + spacing[6] : 0

  const gemButtonLabel = gemGiven
    ? "Gem Given ✦"
    : isGivingGem
      ? "Sending…"
      : "✦ Give Gym Gem"
  const gemButtonTextStyles: any[] = [styles.gemButtonText]
  if (gemGiven) gemButtonTextStyles.push(styles.gemButtonTextGiven)
  else if (!hasGemToday) gemButtonTextStyles.push(styles.gemButtonTextInactive)

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      {closeButton}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <PhotoSection
          photos={profile.photo_urls || []}
          imageHeight={imageHeight}
          onOpenImageChat={handleOpenImageChat}
          showChatBubble={!isGymGem}
          enableZoom
        />

        <View style={styles.contentSection}>
          <ProfileHeader
            displayName={profile.display_name}
            age={profile.age}
            distanceKm={distanceKm}
            variant="compact"
          />

          {!isGymGem && (
            <View style={styles.gymGemRow}>
              <View style={styles.gymGemBadge}>
                <Gem size={16} color={colors.primary} />
                <Text style={styles.gymGemBadgeText}>Gym Gem</Text>
              </View>
            </View>
          )}

          {/* 1. Top prompt (most engaged) */}
          {prompt1 && (
            <View style={styles.promptSection}>
              <PromptItem
                title={prompt1.title}
                answer={prompt1.answer}
                onPress={() => handlePromptPress(prompt1.title, prompt1.answer)}
                highlighted
                showMessageButton={!isGymGem}
              />
            </View>
          )}

          {/* 2. Info box */}
          <ProfileInfoBox
            height={profile.height ?? null}
            intent={formattedIntents}
            occupation={profile.occupation ?? null}
            city={profileGym?.city ?? null}
          />

          {/* 3. Prompt 2 */}
          {prompt2 && (
            <PromptItem
              title={prompt2.title}
              answer={prompt2.answer}
              onPress={() => handlePromptPress(prompt2.title, prompt2.answer)}
              highlighted
              showMessageButton={!isGymGem}
            />
          )}

          {/* 5. Lifestyle info box */}
          <ProfileLifestyleBox
            ethnicity={Array.isArray((profile as any).ethnicity) ? (profile as any).ethnicity : null}
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
              onPress={() => handlePromptPress(prompt3.title, prompt3.answer)}
              highlighted
              showMessageButton={!isGymGem}
            />
          )}

          {/* Fitness badges — hidden in gym-gem mode */}
          {!isGymGem && disciplines.length > 0 && (
            <View style={styles.badgesSection}>
              <FitnessBadges disciplines={disciplines} />
            </View>
          )}
        </View>
      </ScrollView>

      {isGymGem && (
        <View
          style={[styles.actionBar, { height: ACTION_BAR_HEIGHT + insets.bottom }]}
          pointerEvents="box-none"
        >
          <MaskedView
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            maskElement={
              <LinearGradient
                colors={["rgba(0,0,0,0)", "rgba(0,0,0,1)"]}
                locations={[0, 0.65]}
                style={StyleSheet.absoluteFill}
              />
            }
          >
            <BlurView
              tint="dark"
              intensity={45}
              style={StyleSheet.absoluteFill}
            />
          </MaskedView>
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            style={[
              styles.actionBarInner,
              { paddingBottom: Math.max(insets.bottom, spacing[3]) },
            ]}
          >
            <Pressable
              onPress={handleGiveGem}
              disabled={isGivingGem || gemGiven}
              style={({ pressed }) => [
                styles.gemButton,
                hasGemToday && !gemGiven ? styles.gemButtonActive : styles.gemButtonInactive,
                gemGiven && styles.gemButtonGiven,
                pressed && styles.gemButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                gemGiven ? "Gem given" : hasGemToday ? "Give gem" : "No gem available"
              }
            >
              <View style={styles.gemButtonInner}>
                <Gem
                  size={20}
                  color={
                    gemGiven
                      ? colors.primary
                      : hasGemToday
                        ? colors.primaryForeground
                        : colors.mutedForeground
                  }
                />
                <Text style={gemButtonTextStyles}>{gemButtonLabel}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}
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
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
  },
  promptSection: {
    marginBottom: spacing[4],
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
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 11,
  },
  actionBarInner: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
  },
  gemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    minHeight: 52,
  },
  gemButtonActive: {
    backgroundColor: colors.primary,
  },
  gemButtonInactive: {
    backgroundColor: colors.muted,
    opacity: 0.85,
  },
  gemButtonGiven: {
    backgroundColor: colors.muted,
  },
  gemButtonPressed: {
    opacity: 0.9,
  },
  gemButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  gemButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.primaryForeground,
  },
  gemButtonTextGiven: {
    color: colors.primary,
  },
  gemButtonTextInactive: {
    color: colors.mutedForeground,
  },
})
