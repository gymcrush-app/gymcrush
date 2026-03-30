import {
  DISCOVER_PHOTO_WIDTH,
  PHOTO_INSET,
  PhotoSection,
} from "@/components/profile/PhotoSection"
import { ProfileDetailContent } from "@/components/profile/ProfileDetailContent"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { PromptsList } from "@/components/profile/PromptsList"
import { Text } from "@/components/ui/Text"
import {
  getSwipeUpMatchLabel,
  SWIPE_DOWN_LABEL,
  TOOLTIP_SWIPE_DOWN,
  TOOLTIP_SWIPE_UP,
} from "@/constants"
import { useGymById } from "@/lib/api/gyms"
import { useSendMessageRequest } from "@/lib/api/messages"
import { toast } from "@/lib/toast"
import { formatDistanceKmRounded } from "@/lib/utils/distance"
import { formatIntents } from "@/lib/utils/formatting"
import {
  borderRadius,
  colors,
  fontSize,
  palette,
  spacing,
  swipe,
} from "@/theme"
import type { Profile, SwipeAction } from "@/types"
import type { Intent } from "@/types/onboarding"
import BottomSheet from "@gorhom/bottom-sheet"
import { useRouter } from "expo-router"
import { Check, MoreHorizontal } from "lucide-react-native"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import Tooltip from "react-native-walkthrough-tooltip"
import { MessageBottomSheet } from "./MessageBottomSheet"
import { SwipeIndicator } from "./SwipeIndicator"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

/** Duration of the card exit animation before advancing */
const CARD_EXIT_MS = 180
/** Brief pause after tick before advancing to next profile */
const TICK_DISPLAY_MS = 500
const BACK_CARD_SCALE = 0.96
const BACK_CARD_TRANSLATE_Y = 26
const BACK_CARD_OPACITY = 0.92
/** Pull-past-top distance (px) to trigger drop/pass */
const DROP_TRIGGER = 90
/** Scroll-past-bottom distance (px) to trigger crush/like */
const CRUSH_TRIGGER = 100
/** Logo starting opacity — fades to 1.0 as it grows */
const START_OPACITY = 0.3

interface SwipeDeckProps {
  profiles: Profile[]
  onSwipe: (profileId: string, action: SwipeAction) => void
  /** Set by parent after a like/crush: 'match' triggers celebration, 'no-match' shows tick. null = waiting. */
  swipeResult?: "match" | "no-match" | null
  /** Called after all exit animations complete and SwipeDeck is ready for the next profile. */
  onSwipeComplete?: () => void
  showPhotoSwipeTooltip?: boolean
  showImageCommentTooltip?: boolean
  showSwipeDownTooltip?: boolean
  showSwipeUpTooltip?: boolean
  onPhotoSwipeTooltipClose?: () => void
  onImageCommentTooltipClose?: () => void
  onSwipeDownTooltipClose?: () => void
  onSwipeUpTooltipClose?: () => void
  /** Called when user scrolls inside the deck. Use to show/hide header pills and show first name. */
  onScrollStateChange?: (state: { scrollY: number; isAtTop: boolean }) => void
  /** Called when user taps Report & Block on the profile. */
  onReportAndBlock?: (profileId: string) => void
  /** Pre-computed distances (miles) keyed by profile ID — avoids redundant gym lookups */
  distances?: Map<string, number | null>
}

export function SwipeDeck({
  profiles,
  onSwipe,
  swipeResult,
  onSwipeComplete,
  showPhotoSwipeTooltip = false,
  showImageCommentTooltip = false,
  showSwipeDownTooltip = false,
  showSwipeUpTooltip = false,
  onPhotoSwipeTooltipClose,
  onImageCommentTooltipClose,
  onSwipeDownTooltipClose,
  onSwipeUpTooltipClose,
  onScrollStateChange,
  onReportAndBlock,
  distances,
}: SwipeDeckProps) {
  const topProfile = profiles[0]
  const nextProfile = profiles[1]
  const { data: profileGym } = useGymById(topProfile?.home_gym_id || "")

  // Scroll position tracking
  const scrollViewRef = useRef<ScrollView>(null)
  const lastIsAtTopRef = useRef(true)
  const [hasTriggeredInterested, setHasTriggeredInterested] = useState(false)
  const [hasTriggeredSkip, setHasTriggeredSkip] = useState(false)
  const [swipeUpTooltipVisible, setSwipeUpTooltipVisible] = useState(false)
  /** Tracks whether we're waiting for match result after swipe-up */
  const [awaitingResult, setAwaitingResult] = useState(false)
  /** Shows the tick overlay for no-match */
  const [showTick, setShowTick] = useState(false)
  /** Size of the expanding image overlays (0 = hidden) */
  const dropImageSize = useSharedValue(0)
  const crushImageSize = useSharedValue(0)

  const bottomSheetRef = useRef<BottomSheet>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<{
    title: string
    answer: string
  } | null>(null)
  const [isImageChat, setIsImageChat] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [bottomSheetIndex, setBottomSheetIndex] = useState(-1)
  const bottomSheetIndexRef = useRef(-1)
  const snapPoints = useMemo(() => ["50%", "90%"], [])

  const translateY = useSharedValue(0)
  const opacity = useSharedValue(1)
  const photoScale = useSharedValue(1)
  const isDismissing = useSharedValue(false)
  const threshold = swipe.verticalThreshold


  // --- Swipe-up result handling ---
  // When parent sets swipeResult after a like, react accordingly
  useEffect(() => {
    if (!awaitingResult || swipeResult == null) return

    if (swipeResult === "match") {
      // Skip celebration — go straight to match modal
      setAwaitingResult(false)
      onSwipeComplete?.()
    } else {
      // No match — show tick briefly, then advance
      setShowTick(true)
      setTimeout(() => {
        setShowTick(false)
        setAwaitingResult(false)
        onSwipeComplete?.()
      }, TICK_DISPLAY_MS)
    }
  }, [swipeResult, awaitingResult])

  const panGesture = Gesture.Pan()
    .activeOffsetY([-20, 20])
    .onUpdate((event) => {
      if (isDismissing.value) return
      if (Math.abs(event.translationY) > Math.abs(event.translationX)) {
        translateY.value = event.translationY
        // Gentle fade — card stays mostly visible during drag, only dims ~30% at threshold
        const progress = Math.min(
          1,
          Math.abs(event.translationY) / (threshold * 1.5),
        )
        opacity.value = 1 - progress * 0.3
        if (event.translationY < 0) {
          // Swipe up (crush) — grow crush image
          photoScale.value = 1 + Math.min(-event.translationY / 300, 0.2)
          dropImageSize.value = 0
          const pull = -event.translationY
          const maxSize = SCREEN_WIDTH * 0.8
          crushImageSize.value = Math.min(maxSize, 80 + pull * 1.5)
        } else {
          // Swipe down (drop) — grow drop image
          photoScale.value = 1
          crushImageSize.value = 0
          const maxSize = SCREEN_WIDTH * 0.8
          dropImageSize.value = Math.min(maxSize, 80 + event.translationY * 1.5)
        }
      }
    })
    .onEnd((event) => {
      if (isDismissing.value) return
      const velocity = event.velocityY
      const triggered =
        Math.abs(event.translationY) > threshold ||
        Math.abs(velocity) > swipe.velocityThreshold

      if (triggered) {
        if (event.translationY > 0 || velocity > 0) {
          // --- Swipe DOWN (pass) --- fire immediately, card resets on profile change
          dropImageSize.value = withTiming(0, { duration: 150 })
          crushImageSize.value = 0
          if (topProfile) runOnJS(onSwipe)(topProfile.id, "pass")
        } else {
          // --- Swipe UP (like) --- fire immediately, animate card out while waiting for result
          isDismissing.value = true
          crushImageSize.value = withTiming(0, { duration: 150 })
          translateY.value = withTiming(-SCREEN_HEIGHT * 0.35, {
            duration: CARD_EXIT_MS,
            easing: Easing.out(Easing.quad),
          })
          opacity.value = withTiming(0, { duration: CARD_EXIT_MS })
          if (topProfile) {
            runOnJS(onSwipe)(topProfile.id, "like")
            runOnJS(setAwaitingResult)(true)
          }
        }
      } else {
        // Snap back
        translateY.value = withSpring(0)
        opacity.value = withSpring(1)
        photoScale.value = withSpring(1)
        dropImageSize.value = withTiming(0, { duration: 150 })
        crushImageSize.value = withTiming(0, { duration: 150 })
      }
    })

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const animatedBackCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      1,
      Math.abs(translateY.value) / Math.max(1, threshold),
    )

    const scale = BACK_CARD_SCALE + (1 - BACK_CARD_SCALE) * progress
    const ty = BACK_CARD_TRANSLATE_Y * (1 - progress)
    const op = BACK_CARD_OPACITY + (1 - BACK_CARD_OPACITY) * progress

    return {
      transform: [{ translateY: ty }, { scale }],
      opacity: op,
    }
  })

  const animatedPhotoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }))

  const dropImageAnimatedStyle = useAnimatedStyle(() => {
    if (dropImageSize.value <= 0) return { width: 0, height: 0, opacity: 0 }
    // progress 0→1 from first appearance to trigger point
    const progress = Math.min(1, (dropImageSize.value - 80) / (SCREEN_WIDTH * 0.5))
    return {
      width: dropImageSize.value,
      height: dropImageSize.value * 0.4,
      opacity: START_OPACITY + (1 - START_OPACITY) * progress,
    }
  })

  const crushImageAnimatedStyle = useAnimatedStyle(() => {
    if (crushImageSize.value <= 0) return { width: 0, height: 0, opacity: 0 }
    const progress = Math.min(1, (crushImageSize.value - 80) / (SCREEN_WIDTH * 0.5))
    return {
      width: crushImageSize.value,
      height: crushImageSize.value * 0.4,
      opacity: START_OPACITY + (1 - START_OPACITY) * progress,
    }
  })

  useEffect(() => {
    setHasTriggeredInterested(false)
    setHasTriggeredSkip(false)
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    setSwipeUpTooltipVisible(false)
    setAwaitingResult(false)
    setShowTick(false)
    crushImageSize.value = 0
    dropImageSize.value = 0
    translateY.value = 0
    opacity.value = 1
    photoScale.value = 1
    dropImageSize.value = 0
    isDismissing.value = false
    bottomSheetRef.current?.close()
    scrollViewRef.current?.scrollTo({ y: 0, animated: false })
  }, [topProfile?.id])

  useEffect(() => {
    if (showSwipeUpTooltip) {
      setSwipeUpTooltipVisible(false)
      scrollViewRef.current?.scrollToEnd({ animated: true })
      const timer = setTimeout(() => {
        setSwipeUpTooltipVisible(true)
      }, 450)
      return () => clearTimeout(timer)
    } else {
      setSwipeUpTooltipVisible(false)
    }
  }, [showSwipeUpTooltip])

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener("keyboardWillShow", () => {
      if (bottomSheetRef.current && bottomSheetIndexRef.current >= 0) {
        bottomSheetRef.current.snapToIndex(2)
      }
    })
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      if (bottomSheetRef.current && bottomSheetIndexRef.current >= 0) {
        bottomSheetRef.current.snapToIndex(2)
      }
    })
    const keyboardWillHide = Keyboard.addListener("keyboardWillHide", () => {
      if (bottomSheetRef.current && bottomSheetIndexRef.current >= 0) {
        bottomSheetRef.current.snapToIndex(0)
      }
    })
    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      if (bottomSheetRef.current && bottomSheetIndexRef.current >= 0) {
        bottomSheetRef.current.snapToIndex(0)
      }
    })
    return () => {
      keyboardWillShow.remove()
      keyboardDidShow.remove()
      keyboardWillHide.remove()
      keyboardDidHide.remove()
    }
  }, [])

  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent
      const currentScrollY = contentOffset.y
      const scrollBottom = currentScrollY + layoutMeasurement.height
      const pastBottom = scrollBottom - contentSize.height
      const scrollThreshold = 50

      const isAtTop = currentScrollY <= scrollThreshold
      if (isAtTop !== lastIsAtTopRef.current) {
        lastIsAtTopRef.current = isAtTop
        onScrollStateChange?.({ scrollY: currentScrollY, isAtTop })
      }

      if (currentScrollY > 10 && hasTriggeredInterested) {
        setHasTriggeredInterested(false)
      }
      if (currentScrollY > -10 && hasTriggeredSkip) {
        setHasTriggeredSkip(false)
      }

      // Drive the drop image on pull-down (negative scroll = pulling past top)
      if (currentScrollY < 0) {
        const pullDown = Math.abs(currentScrollY)
        const maxSize = SCREEN_WIDTH * 0.8
        dropImageSize.value = Math.min(maxSize, 80 + pullDown * 2)
        crushImageSize.value = 0
      } else {
        dropImageSize.value = 0
      }

      // Drive the crush image when scrolling past bottom
      if (pastBottom > 0) {
        const maxSize = SCREEN_WIDTH * 0.8
        crushImageSize.value = Math.min(maxSize, 80 + pastBottom * 2)
      } else {
        crushImageSize.value = 0
      }

      if (
        pastBottom >= CRUSH_TRIGGER &&
        !hasTriggeredInterested
      ) {
        setHasTriggeredInterested(true)
        if (topProfile) {
          onSwipe(topProfile.id, "like")
          setAwaitingResult(true)
        }
      }
      if (currentScrollY < -DROP_TRIGGER && !hasTriggeredSkip && topProfile) {
        setHasTriggeredSkip(true)
        // Fade out the drop logo, snap scroll to top, then fire pass
        dropImageSize.value = withTiming(0, { duration: 200 })
        scrollViewRef.current?.scrollTo({ y: 0, animated: false })
        onSwipe(topProfile.id, "pass")
      }
    },
    [
      hasTriggeredInterested,
      hasTriggeredSkip,
      onSwipe,
      topProfile,
      onScrollStateChange,
    ],
  )

  const mockPrompts = useMemo(
    () => [
      {
        title: "MY GYM HOT TAKE IS",
        answer:
          "Cardio is just as important as lifting, and I'll die on this hill.",
      },
      {
        title: "THE WAY TO WIN ME OVER IS",
        answer: "Spot me on bench press and share your protein shake recipe.",
      },
      {
        title: "I'M LOOKING FOR",
        answer:
          "Someone who understands that 5am gym sessions are non-negotiable.",
      },
    ],
    [],
  )

  const handleCloseBottomSheet = useCallback(() => {
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    bottomSheetRef.current?.close()
  }, [])

  const router = useRouter()
  const sendMessageRequest = useSendMessageRequest()

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !topProfile) return

      try {
        await sendMessageRequest.mutateAsync({
          toUserId: topProfile.id,
          content: content.trim(),
          ...(selectedPrompt
            ? {
                reactionType: "prompt" as const,
                reactionPromptTitle: selectedPrompt.title,
                reactionPromptAnswer: selectedPrompt.answer,
              }
            : isImageChat
              ? {
                  reactionType: "image" as const,
                  reactionImageUrl: topProfile.photo_urls?.[0] ?? undefined,
                }
              : {}),
        })

        handleCloseBottomSheet()

        setTimeout(() => {
          router.push("/(tabs)/chat")
        }, 500)
      } catch (error: any) {
        console.error("Error sending message:", error)
        toast({
          preset: "error",
          title: "Failed to send message",
          message: error?.message || "Please try again.",
        })
      }
    },
    [
      topProfile,
      sendMessageRequest,
      handleCloseBottomSheet,
      router,
      selectedPrompt,
      isImageChat,
    ],
  )

  const handleOpenImageChat = useCallback(() => {
    setIsImageChat(true)
    setSelectedPrompt(null)
    bottomSheetRef.current?.snapToIndex(0)
  }, [])

  const handlePromptPress = useCallback((title: string, answer: string) => {
    setSelectedPrompt({ title, answer })
    bottomSheetRef.current?.snapToIndex(0)
  }, [])

  const handleBottomSheetChange = useCallback((index: number) => {
    setBottomSheetIndex(index)
    bottomSheetIndexRef.current = index
    if (index === -1) {
      setSelectedPrompt(null)
      setIsImageChat(false)
      setMessageText("")
    }
  }, [])

  const imageHeight = SCREEN_WIDTH * (1350 / 1080) - 30
  const effectiveImageHeight = imageHeight

  const handleReportAndBlock = useCallback(() => {
    Alert.alert(
      "Report & Block",
      "Are you sure you want to report and block this person?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report & Block",
          style: "destructive",
          onPress: () => topProfile && onReportAndBlock?.(topProfile.id),
        },
      ],
    )
  }, [onReportAndBlock, topProfile])

  if (profiles.length === 0 || !topProfile) {
    return null
  }

  // Use pre-computed distance from parent
  const distance = distances?.get(topProfile.id) ?? null

  // Get intents from discovery_preferences
  const discoveryPrefs = topProfile.discovery_preferences as any
  const intents = (discoveryPrefs?.intents || []) as Intent[]
  const height = topProfile.height ?? discoveryPrefs?.height ?? null

  // Format data for sub-components
  const distanceKm = formatDistanceKmRounded(distance)
  const formattedIntents = formatIntents(intents)

  return (
    <View style={styles.container}>
      <View style={styles.stackContainer}>
        {nextProfile ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.backCard, animatedBackCardStyle]}
          >
            <View style={styles.nameRow}>
              <ProfileHeader
                displayName={nextProfile.display_name}
                age={nextProfile.age}
                distanceKm={null}
                variant="compact"
              />
            </View>
            <View
              style={[styles.photoWrapper, { height: effectiveImageHeight }]}
            >
              <PhotoSection
                photos={nextProfile.photo_urls}
                imageHeight={effectiveImageHeight}
                photoWidth={DISCOVER_PHOTO_WIDTH}
                onOpenImageChat={() => {}}
                showPhotoSwipeTooltip={false}
                showImageCommentTooltip={false}
              />
            </View>
          </Animated.View>
        ) : null}

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.frontCard, animatedCardStyle]}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              bounces={true}
              overScrollMode="always"
            >
              <View style={styles.nameRow}>
                <ProfileHeader
                  displayName={topProfile.display_name}
                  age={topProfile.age}
                  distanceKm={distanceKm}
                  variant="compact"
                />
              </View>
              <View
                style={[styles.photoWrapper, { height: effectiveImageHeight }]}
              >
                <Animated.View style={animatedPhotoStyle}>
                  <PhotoSection
                    photos={topProfile.photo_urls}
                    imageHeight={effectiveImageHeight}
                    photoWidth={DISCOVER_PHOTO_WIDTH}
                    onOpenImageChat={handleOpenImageChat}
                    showPhotoSwipeTooltip={showPhotoSwipeTooltip}
                    showImageCommentTooltip={showImageCommentTooltip}
                    onPhotoSwipeTooltipClose={onPhotoSwipeTooltipClose}
                    onImageCommentTooltipClose={onImageCommentTooltipClose}
                  />
                </Animated.View>
                {/* Top overlay: Approachable (left) and Report & Block (right), vertically centered with each other */}
                <View style={styles.imageTopOverlay}>
                  <View style={styles.imageTopOverlayLeft}>
                    {topProfile.approach_prompt &&
                      topProfile.approach_prompt.trim().length > 0 && (
                        <Pressable style={styles.approachablePill}>
                          <Text
                            variant="bodySmall"
                            weight="semibold"
                            style={styles.approachableText}
                          >
                            Approachable
                          </Text>
                        </Pressable>
                      )}
                  </View>
                  <Pressable
                    onPress={handleReportAndBlock}
                    style={styles.reportBlockButton}
                  >
                    <MoreHorizontal size={20} color={colors.foreground} />
                  </Pressable>
                </View>
              </View>

              <Tooltip
                isVisible={showSwipeDownTooltip}
                allowChildInteraction={false}
                contentStyle={{
                  backgroundColor: colors.primary,
                  padding: 0,
                  borderRadius: borderRadius.md,
                }}
                content={
                  <View
                    style={{
                      backgroundColor: colors.primary,
                      padding: spacing[3],
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Text
                      style={{
                        color: palette.black,
                        fontSize: fontSize.base,
                      }}
                    >
                      {TOOLTIP_SWIPE_DOWN}
                    </Text>
                  </View>
                }
                placement="top"
                onClose={onSwipeDownTooltipClose}
                backgroundColor="rgba(0,0,0,0.5)"
              >
                <View style={{ width: "100%" }}>
                  <SwipeIndicator direction="down" text={SWIPE_DOWN_LABEL} />
                </View>
              </Tooltip>

              <View style={styles.contentSection}>
                <ProfileDetailContent
                  height={height}
                  intent={formattedIntents}
                  occupation={topProfile.occupation ?? null}
                  city={profileGym?.city ?? null}
                  bio={topProfile.bio}
                >
                  <PromptsList
                    prompts={mockPrompts}
                    onPromptPress={handlePromptPress}
                  />

                  <Tooltip
                    isVisible={swipeUpTooltipVisible}
                    allowChildInteraction={false}
                    contentStyle={{
                      backgroundColor: colors.primary,
                      padding: 0,
                      borderRadius: borderRadius.md,
                    }}
                    content={
                      <View
                        style={{
                          backgroundColor: colors.primary,
                          padding: spacing[3],
                          borderRadius: borderRadius.md,
                        }}
                      >
                        <Text
                          style={{
                            color: palette.black,
                            fontSize: fontSize.base,
                          }}
                        >
                          {TOOLTIP_SWIPE_UP}
                        </Text>
                      </View>
                    }
                    placement="bottom"
                    onClose={onSwipeUpTooltipClose}
                    backgroundColor="rgba(0,0,0,0.5)"
                  >
                    <SwipeIndicator
                      direction="up"
                      text={getSwipeUpMatchLabel(topProfile.display_name)}
                      containerStyle="up"
                    />
                  </Tooltip>
                </ProfileDetailContent>
              </View>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Drop logo on swipe-down / pull-past-top — anchored above card top */}
      <View style={styles.dropOverlayContainer} pointerEvents="none">
        <Animated.View style={dropImageAnimatedStyle}>
          <Image
            source={require("@/assets/images/DropLogo.png")}
            style={styles.dropImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Crush logo on swipe-up / scroll-past-bottom — anchored below card bottom */}
      <View style={styles.crushOverlayContainer} pointerEvents="none">
        <Animated.View style={crushImageAnimatedStyle}>
          <Image
            source={require("@/assets/images/CrushLogo.png")}
            style={styles.dropImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Tick overlay – shown briefly on like with no match */}
      {showTick && (
        <Animated.View
          style={styles.swipeOverlayContainer}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          pointerEvents="none"
        >
          <View style={styles.tickCircle}>
            <Check size={48} color={colors.primaryForeground} strokeWidth={3} />
          </View>
        </Animated.View>
      )}

      <MessageBottomSheet
        bottomSheetRef={bottomSheetRef}
        selectedPrompt={selectedPrompt}
        isImageChat={isImageChat}
        messageText={messageText}
        profileName={topProfile.display_name}
        snapPoints={snapPoints}
        bottomSheetIndex={bottomSheetIndex}
        onMessageTextChange={setMessageText}
        onClose={handleCloseBottomSheet}
        onSend={handleSendMessage}
        onChange={handleBottomSheetChange}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stackContainer: {
    flex: 1,
    position: "relative",
  },
  backCard: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  frontCard: {
    flex: 1,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
  },
  approachablePill: {
    backgroundColor: `${colors.card}CC`,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  approachableText: {
    color: colors.primary,
  },
  photoWrapper: {
    position: "relative",
    width: SCREEN_WIDTH,
  },
  imageTopOverlay: {
    position: "absolute",
    top: spacing[4],
    left: PHOTO_INSET + spacing[4],
    right: PHOTO_INSET + spacing[4],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  imageTopOverlayLeft: {
    alignItems: "flex-start",
  },
  reportBlockButton: {
    padding: spacing[2],
  },
  logoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: spacing[6],
  },
  logoContainer: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  logoAnimatedWrap: {
    position: "absolute",
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  contentSection: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[6],
  },
  swipeOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dropOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 30 + spacing[1],
  },
  crushOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: spacing[1],
  },
  dropImage: {
    width: "100%",
    height: "100%",
  },
  tickCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
})
