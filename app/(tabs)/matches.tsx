import { GymGemCard } from "@/components/gymGems/GymGemCard"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { Text } from "@/components/ui/Text"
import { useDailyGem, useGiveGymGem } from "@/lib/api/gemGifts"
import { useGymGems } from "@/lib/api/gymGems"
import { useGymsByIds } from "@/lib/api/gyms"
import { useUserProfileModal } from "@/lib/contexts/UserProfileModalContext"
import { borderRadius, colors, fontSize, fontWeight, spacing } from "@/theme"
import type { ProfileWithScore } from "@/types"
import { toast } from "@/lib/toast"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { Compass, Gem } from "lucide-react-native"
import React, { useCallback, useMemo, useState } from "react"
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const GYM_CRUSH_HEART_IMAGE = require("@/assets/images/GymCrushHeart.png")

const GYM_GEMS_RADIUS_MILES = 30
const { width: SCREEN_WIDTH } = Dimensions.get("window")

export default function GymGemsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { openUserProfile } = useUserProfileModal()
  const {
    data: gems = [],
    isLoading,
    error,
  } = useGymGems(GYM_GEMS_RADIUS_MILES)
  const { hasGemToday } = useDailyGem()
  const giveGemMutation = useGiveGymGem()
  const [pendingToUserId, setPendingToUserId] = useState<string | null>(null)

  const handleGiveGem = useCallback(
    async (toUserId: string) => {
      setPendingToUserId(toUserId)
      try {
        const result = await giveGemMutation.mutateAsync(toUserId)
        if (!result.ok && result.error)
          toast({
            preset: "error",
            title:
              result.error === "no_gem_available"
                ? "No gem left today"
                : result.error,
          })
      } finally {
        setPendingToUserId(null)
      }
    },
    [giveGemMutation],
  )

  const gymIds = useMemo(
    () =>
      [...new Set(gems.map((p) => p.home_gym_id).filter(Boolean))] as string[],
    [gems],
  )
  const { data: gymsMap } = useGymsByIds(gymIds)
  const getGymName = useCallback(
    (gymId: string | null) => (gymId && gymsMap?.get(gymId)?.name) || null,
    [gymsMap],
  )

  const [listHeight, setListHeight] = useState(0)

  const renderItem = useCallback(
    ({ item }: { item: ProfileWithScore }) => (
      <View style={styles.cardWrapper}>
        <GymGemCard
          item={item}
          gymName={getGymName(item.home_gym_id)}
          onPress={openUserProfile}
          cardHeight={listHeight}
          hasGemToday={hasGemToday}
          onGiveGem={handleGiveGem}
          isGivingGem={pendingToUserId === item.id}
        />
      </View>
    ),
    [
      getGymName,
      openUserProfile,
      listHeight,
      hasGemToday,
      pendingToUserId,
      handleGiveGem,
    ],
  )

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading Gym Gems</Text>
          {error instanceof Error && (
            <Text style={styles.errorDetail}>{error.message}</Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, spacing[4]) },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextColumn}>
            <Text style={styles.headerTitle}>Gym Gems</Text>
            <Text style={styles.headerSubtitle}>
              Most liked and messaged near you
            </Text>
          </View>
          {gems.length > 0 && (
            <View style={styles.gemsPill}>
              <Gem size={16} color={colors.primaryForeground} />
              <Text style={styles.gemsPillText}>
                {hasGemToday ? "1" : "0"} gem{hasGemToday ? "" : "s"} today
              </Text>
            </View>
          )}
        </View>
      </View>

      {gems.length === 0 && !isLoading ? (
        <EmptyState
          icon={
            <Image
              source={GYM_CRUSH_HEART_IMAGE}
              style={{ width: 120, height: 120 }}
              contentFit="contain"
            />
          }
          iconVariant="image"
          title="Find your Gym Crush"
          description="Swipe on Discover to find the most liked and messaged people near you."
          action={
            <Button
              onPress={() => router.replace("/(tabs)/discover")}
              variant="primary"
              size="lg"
            >
              <View style={styles.emptyStateButtonContent}>
                <Compass size={16} color={colors.primaryForeground} />
                <Text
                  variant="body"
                  weight="semibold"
                  style={{ color: colors.primaryForeground }}
                >
                  Go to Discover
                </Text>
              </View>
            </Button>
          }
        />
      ) : (
        <FlatList
          data={gems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gemsList}
          contentContainerStyle={styles.horizontalListContent}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[4],
  },
  headerTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
    flexShrink: 1,
  },
  gemsPill: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
  },
  gemsPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
  gemsList: {
    flex: 1,
  },
  horizontalListContent: {
    alignItems: "stretch",
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[4],
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.destructive,
    marginBottom: spacing[2],
  },
  errorDetail: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  emptyStateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
})
