import {
  getSwipeUpMatchLabel,
  SWIPE_DOWN_LABEL,
  TOOLTIP_SWIPE_DOWN,
  TOOLTIP_SWIPE_UP,
} from "@/constants"
import { useGymById } from "@/lib/api/gyms"
import { useSendMessageRequest } from "@/lib/api/messages"
import { useProfile } from "@/lib/api/profiles"
import {
  calculateDistanceMiles,
  formatDistanceKmRounded,
} from "@/lib/utils/distance"
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
import { toastSuccess } from "@/lib/toast"
import { toast } from "burnt"
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
import { Text } from "@/components/ui/Text"
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
import { ProfileDetailContent } from "@/components/profile/ProfileDetailContent"
import {
  DISCOVER_PHOTO_WIDTH,
  PHOTO_INSET,
  PhotoSection,
} from "@/components/profile/PhotoSection"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { PromptsList } from "@/components/profile/PromptsList"
import { MessageBottomSheet } from "./MessageBottomSheet"
import { CrushUnlockedOverlay } from "@/components/discover/CrushUnlockedOverlay"
import { SwipeIndicator } from "./SwipeIndicator"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

const CELEBRATION_DURATION_MS = 3000
const DELAY_BEFORE_NEXT_PROFILE_MS = 3200
/** Duration of the card exit animation before advancing */
const CARD_EXIT_MS = 180
/** Brief pause after tick before advancing to next profile */
const TICK_DISPLAY_MS = 500
const BACK_CARD_SCALE = 0.96
const BACK_CARD_TRANSLATE_Y = 12
const BACK_CARD_OPACITY = 0.92

interface SwipeDeckProps {
  profiles: Profile[]
  onSwipe: (profileId: string, action: SwipeAction) => void
  currentUserGymId?: string | null
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
}

export function SwipeDeck({
  profiles,
  onSwipe,
  currentUserGymId,
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
}: SwipeDeckProps) {
  const topProfile = profiles[0]
  const nextProfile = profiles[1]
  const { data: currentUserProfile } = useProfile()
  const { data: profileGym } = useGymById(topProfile?.home_gym_id || "")
  const { data: currentUserGym } = useGymById(currentUserGymId || "")

  // Scroll position tracking
  const scrollViewRef = useRef<ScrollView>(null)
  const [_scrollPosition, setScrollPosition] = useState(0)
  const [hasTriggeredInterested, setHasTriggeredInterested] = useState(false)
  const [hasTriggeredSkip, setHasTriggeredSkip] = useState(false)
  const [swipeUpTooltipVisible, setSwipeUpTooltipVisible] = useState(false)
  const [isConfettiDismissing, setIsConfettiDismissing] = useState(false)
  const [isProductionConfettiActive, setIsProductionConfettiActive] = useState(false)
  const [devPastBottom, setDevPastBottom] = useState(0)
  const devConfettiTriggeredRef = useRef(false)
  const [devConfettiActive, setDevConfettiActive] = useState(false)
  /** Tracks whether we're waiting for match result after swipe-up */
  const [awaitingResult, setAwaitingResult] = useState(false)
  /** Shows the tick overlay for no-match */
  const [showTick, setShowTick] = useState(false)
  /** Size of the expanding image on swipe-down (0 = hidden) */
  const dropImageSize = useSharedValue(0)

  const bottomSheetRef = useRef<BottomSheet>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<{
    title: string
    answer: string
  } | null>(null)
  const [isImageChat, setIsImageChat] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [bottomSheetIndex, setBottomSheetIndex] = useState(-1)
  const snapPoints = useMemo(() => ["50%", "90%"], [])

  const translateY = useSharedValue(0)
  const opacity = useSharedValue(1)
  const photoScale = useSharedValue(1)
  const confettiProgress = useSharedValue(0)
  const isDismissing = useSharedValue(false)
  const devExpandOpacity = useSharedValue(0)
  const threshold = swipe.verticalThreshold

  const celebrationStartRef = useRef(0)

  // --- Swipe-up result handling ---
  // When parent sets swipeResult after a like, react accordingly
  useEffect(() => {
    if (!awaitingResult || swipeResult == null) return

    if (swipeResult === "match") {
      // Play celebration, then parent shows match modal
      celebrationStartRef.current = performance.now()
      setIsProductionConfettiActive(true)
      setIsConfettiDismissing(true)
      confettiProgress.value = withTiming(1, {
        duration: CELEBRATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      })
      setTimeout(() => {
        setAwaitingResult(false)
        onSwipeComplete?.()
      }, DELAY_BEFORE_NEXT_PROFILE_MS)
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
        const progress = Math.min(1, Math.abs(event.translationY) / (threshold * 1.5))
        opacity.value = 1 - progress * 0.3
        if (event.translationY < 0) {
          // Swipe up — zoom photo
          photoScale.value = 1 + Math.min(-event.translationY / 300, 0.2)
          dropImageSize.value = 0
        } else {
          // Swipe down — expand image immediately
          photoScale.value = 1
          const maxSize = SCREEN_WIDTH * 0.8
          dropImageSize.value = Math.min(maxSize, 40 + event.translationY * 1.5)
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
          if (topProfile) runOnJS(onSwipe)(topProfile.id, "pass")
        } else {
          // --- Swipe UP (like) --- fire immediately, animate card out while waiting for result
          isDismissing.value = true
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

  const dropImageAnimatedStyle = useAnimatedStyle(() => ({
    width: dropImageSize.value,
    height: dropImageSize.value,
    opacity: dropImageSize.value > 0 ? Math.min(1, dropImageSize.value / 80) : 0,
  }))

  useEffect(() => {
    setHasTriggeredInterested(false)
    setHasTriggeredSkip(false)
    setScrollPosition(0)
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    setSwipeUpTooltipVisible(false)
    setIsConfettiDismissing(false)
    setIsProductionConfettiActive(false)
    setDevPastBottom(0)
    setDevConfettiActive(false)
    setAwaitingResult(false)
    setShowTick(false)
    devExpandOpacity.value = 0
    devConfettiTriggeredRef.current = false
    confettiProgress.value = 0
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
      if (bottomSheetRef.current && bottomSheetIndex >= 0) {
        bottomSheetRef.current.snapToIndex(2)
      }
    })
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      if (bottomSheetRef.current && bottomSheetIndex >= 0) {
        bottomSheetRef.current.snapToIndex(2)
      }
    })
    const keyboardWillHide = Keyboard.addListener("keyboardWillHide", () => {
      if (bottomSheetRef.current && bottomSheetIndex >= 0) {
        bottomSheetRef.current.snapToIndex(0)
      }
    })
    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      if (bottomSheetRef.current && bottomSheetIndex >= 0) {
        bottomSheetRef.current.snapToIndex(0)
      }
    })
    return () => {
      keyboardWillShow.remove()
      keyboardDidShow.remove()
      keyboardWillHide.remove()
      keyboardDidHide.remove()
    }
  }, [bottomSheetIndex])

  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent
      const currentScrollY = contentOffset.y
      const scrollBottom = currentScrollY + layoutMeasurement.height
      const pastBottom = scrollBottom - contentSize.height
      const scrollThreshold = 50

      setScrollPosition(currentScrollY)
      onScrollStateChange?.({
        scrollY: currentScrollY,
        isAtTop: currentScrollY <= scrollThreshold,
      })

      if (currentScrollY > 10 && hasTriggeredInterested) {
        setHasTriggeredInterested(false)
      }
      if (currentScrollY > -10 && hasTriggeredSkip) {
        setHasTriggeredSkip(false)
      }

      // Drive the expanding image on pull-down (negative scroll = pulling past top)
      if (currentScrollY < 0) {
        const pullDown = Math.abs(currentScrollY)
        const maxSize = SCREEN_WIDTH * 0.8
        dropImageSize.value = Math.min(maxSize, 40 + pullDown * 2)
      } else {
        dropImageSize.value = 0
      }

      if (__DEV__) {
        setDevPastBottom(Math.max(0, pastBottom))
      }
      if (!__DEV__ && pastBottom >= 50 && !hasTriggeredInterested && !isConfettiDismissing) {
        setHasTriggeredInterested(true)
        if (topProfile) {
          onSwipe(topProfile.id, "like")
          setAwaitingResult(true)
        }
      }
      if (currentScrollY < -180 && !hasTriggeredSkip && topProfile) {
        setHasTriggeredSkip(true)
        scrollViewRef.current?.scrollTo({ y: 0, animated: true })
        onSwipe(topProfile.id, "pass")
      }
    },
    [
      hasTriggeredInterested,
      hasTriggeredSkip,
      isConfettiDismissing,
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

        toastSuccess({
          title: "Message sent!",
          message: `Your message to ${topProfile.display_name} has been sent.`,
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
    if (index === -1) {
      setSelectedPrompt(null)
      setIsImageChat(false)
      setMessageText("")
    }
  }, [])

  const imageHeight = SCREEN_WIDTH * (1350 / 1080) - 30
  const effectiveImageHeight = imageHeight

  const DEV_CONFETTI_THRESHOLD = 180
  const devMaxSizePx = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.92
  const devExpandSizePx = __DEV__
    ? devPastBottom < 1
      ? 0
      : devPastBottom >= DEV_CONFETTI_THRESHOLD
        ? SCREEN_WIDTH
        : Math.min(devMaxSizePx, 72 + devPastBottom * 1.8)
    : 0

  useEffect(() => {
    if (!__DEV__) return
    const fadeIn = devPastBottom < 1 ? 0 : Math.min(1, devPastBottom / 50)
    const progressToFull = SCREEN_WIDTH > 0 ? Math.min(1, devExpandSizePx / SCREEN_WIDTH) : 0
    const opacityTarget = fadeIn * (1 - 0.5 * progressToFull)
    if (!devConfettiTriggeredRef.current) {
      devExpandOpacity.value = withTiming(opacityTarget, { duration: 180 })
    }
    if (devPastBottom >= DEV_CONFETTI_THRESHOLD && !devConfettiTriggeredRef.current) {
      devConfettiTriggeredRef.current = true
      setDevConfettiActive(true)
      devExpandOpacity.value = withTiming(0, { duration: 350 })
      if (topProfile) {
        onSwipe(topProfile.id, "like")
        setAwaitingResult(true)
      }
    }
    if (devPastBottom < 30 && !isProductionConfettiActive) {
      devConfettiTriggeredRef.current = false
      setDevConfettiActive(false)
      confettiProgress.value = withTiming(0, { duration: 200 })
    }
  }, [devPastBottom])

  const devExpandAnimatedStyle = useAnimatedStyle(() => ({
    opacity: devExpandOpacity.value,
  }))

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

  // Calculate distance
  const viewerRef =
    (currentUserProfile as any)?.last_location ??
    currentUserGym?.location ??
    null
  const candidateRef =
    (topProfile as any)?.last_location ?? profileGym?.location ?? null
  const distance =
    viewerRef && candidateRef
      ? calculateDistanceMiles(viewerRef, candidateRef)
      : null

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

      {/* Expanding image on swipe-down */}
      <View style={styles.swipeOverlayContainer} pointerEvents="none">
        <Animated.View style={dropImageAnimatedStyle}>
          <Image
            source={require("@/assets/images/GymCrushHeart.png")}
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


      {/* Dev-mode expanding heart preview */}
      {__DEV__ && devExpandSizePx > 0 && !devConfettiActive && (
        <View style={styles.devOverlayContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.devExpandImageWrap,
              { width: devExpandSizePx, height: devExpandSizePx },
              devExpandAnimatedStyle,
            ]}
          >
            <Image
              source={require("@/assets/images/GymCrushHeart.png")}
              style={[styles.devExpandImage, { width: devExpandSizePx, height: devExpandSizePx }]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      )}

      {/* Crush Unlocked celebration */}
      <CrushUnlockedOverlay
        progress={confettiProgress}
        active={isProductionConfettiActive || devConfettiActive}
      />

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
  devOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  devExpandImageWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  devExpandImage: {
    backgroundColor: "transparent",
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
