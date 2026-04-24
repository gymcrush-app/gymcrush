import {
  DISCOVER_PHOTO_WIDTH,
  PHOTO_INSET,
  PhotoSection,
} from "@/components/profile/PhotoSection"
import { PhotoCarouselRef } from "@/components/profile/PhotoCarousel"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { ProfileInfoBox } from "@/components/profile/ProfileInfoBox"
import { ProfileLifestyleBox } from "@/components/profile/ProfileLifestyleBox"
import { PromptItem } from "@/components/profile/PromptItem"
import { Text } from "@/components/ui/Text"
import { useGymById } from "@/lib/api/gyms"
import { useProfilePrompts } from "@/lib/api/prompts"
import { useSendMessageRequest } from "@/lib/api/messages"
import { useZoomPortal } from "@/lib/contexts/ZoomPortalContext"
import { toast } from "@/lib/toast"
import { formatDistanceKmRounded } from "@/lib/utils/distance"
import { formatIntents } from "@/lib/utils/formatting"
import {
  borderRadius,
  colors,
  fontSize,
  palette,
  spacing,
} from "@/theme"
import type { Profile } from "@/types"
import type { Intent } from "@/types/onboarding"
import { BottomSheetModal } from "@gorhom/bottom-sheet"
import { MoreHorizontal } from "lucide-react-native"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from "react-native"
import {
  Gesture,
  GestureDetector,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  measure,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import Tooltip from "react-native-walkthrough-tooltip"
import { MessageBottomSheet } from "./MessageBottomSheet"
import { ProfileDetailSheet } from "./ProfileDetailSheet"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

/** RNGH ScrollView wrapped with Reanimated for gesture coordination */
const AnimatedGHScrollView = Animated.createAnimatedComponent(GHScrollView)

const ZOOM_SPRING = { damping: 40, stiffness: 300 }
const MIN_ZOOM = 1
const MAX_ZOOM = 4

interface SwipeDeckProps {
  profiles: Profile[]
  showPhotoSwipeTooltip?: boolean
  showImageCommentTooltip?: boolean
  onPhotoSwipeTooltipClose?: () => void
  onImageCommentTooltipClose?: () => void
  onScrollStateChange?: (state: { scrollY: number; isAtTop: boolean }) => void
  onReportAndBlock?: (profileId: string) => void
  distances?: Map<string, number | null>
}

export function SwipeDeck({
  profiles,
  showPhotoSwipeTooltip = false,
  showImageCommentTooltip = false,
  onPhotoSwipeTooltipClose,
  onImageCommentTooltipClose,
  onScrollStateChange,
  onReportAndBlock,
  distances,
}: SwipeDeckProps) {
  const topProfile = profiles[0]
  const { data: profileGym } = useGymById(topProfile?.home_gym_id || "")
  const { data: profilePrompts } = useProfilePrompts(topProfile?.id)

  const prompts = useMemo(() => {
    if (!profilePrompts) return []
    return profilePrompts.map((pp) => ({
      id: pp.id,
      title: pp.prompt_text.toUpperCase(),
      answer: pp.answer,
      engagement_count: pp.engagement_count,
    }))
  }, [profilePrompts])

  // Split prompts: most-engaged first, then 2nd and 3rd
  const { prompt1, prompt2, prompt3 } = useMemo(() => {
    if (prompts.length === 0) return { prompt1: null, prompt2: null, prompt3: null }
    const sorted = [...prompts].sort((a, b) => b.engagement_count - a.engagement_count)
    return {
      prompt1: sorted[0] ?? null,
      prompt2: sorted[1] ?? null,
      prompt3: sorted[2] ?? null,
    }
  }, [prompts])

  // Message bottom sheet
  const messageSheetRef = useRef<BottomSheetModal>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<{
    title: string
    answer: string
  } | null>(null)
  const [isImageChat, setIsImageChat] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [messageSheetIndex, setMessageSheetIndex] = useState(-1)
  const messageSheetIndexRef = useRef(-1)
  const messageSnapPoints = useMemo(() => ["50%", "90%"], [])

  // Profile detail bottom sheet
  const detailSheetRef = useRef<BottomSheetModal>(null)

  // Photo carousel ref (for zoom portal URI)
  const photoCarouselRef = useRef<PhotoCarouselRef>(null)
  const photoContainerRef = useAnimatedRef<Animated.View>()

  // Card animation values (reused for exit/entry transition in Task 9)
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(1)

  // Zoom portal
  const {
    overlayScale,
    overlayTranslateX,
    overlayTranslateY,
    isZoomed,
    startZoom,
    endZoom,
  } = useZoomPortal()
  const zoomScaleSaved = useSharedValue(1)

  // Scroll-driven swipe: bounces={true} reports overscroll via contentOffset.
  // Negative offset = pulling down at top (pass), offset > max = pulling up at bottom (like).
  const scrollRef = useRef<GHScrollView>(null)
  const scrollY = useSharedValue(0)

  const notifyScrollState = useCallback(
    (y: number) => {
      onScrollStateChange?.({ scrollY: y, isAtTop: y <= 1 })
    },
    [onScrollStateChange],
  )

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y
      const maxScroll = Math.max(
        0,
        event.contentSize.height - event.layoutMeasurement.height,
      )
      scrollY.value = Math.max(0, Math.min(y, maxScroll))
      runOnJS(notifyScrollState)(y)
    },
  })

  // --- Gestures ---

  // Helper: called on JS thread to read the photo URI from the ref and start zoom
  const startZoomWithCurrentPhoto = useCallback(
    (layout: { x: number; y: number; width: number; height: number }) => {
      const uri = photoCarouselRef.current?.getCurrentPhotoUri()
      if (uri) {
        startZoom({ uri, layout })
      }
    },
    [startZoom],
  )

  // 1. Pinch to zoom (2 fingers)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(overlayScale)
      zoomScaleSaved.value = overlayScale.value > 1 ? overlayScale.value : 1

      try {
        const measured = measure(photoContainerRef)
        if (measured) {
          runOnJS(startZoomWithCurrentPhoto)({
            x: measured.pageX,
            y: measured.pageY,
            width: measured.width,
            height: measured.height,
          })
        }
      } catch {
        // View not yet laid out — skip zoom
      }
    })
    .onUpdate((e) => {
      const next = zoomScaleSaved.value * e.scale
      overlayScale.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    })
    .onFinalize(() => {
      zoomScaleSaved.value = 1
      runOnJS(endZoom)()
    })

  // 2. Pan while zoomed (1-2 fingers, only when zoomed)
  const zoomPanSaved = { x: useSharedValue(0), y: useSharedValue(0) }
  const zoomPanGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      zoomPanSaved.x.value = overlayTranslateX.value
      zoomPanSaved.y.value = overlayTranslateY.value
    })
    .onUpdate((e) => {
      if (isZoomed.value) {
        overlayTranslateX.value = zoomPanSaved.x.value + e.translationX
        overlayTranslateY.value = zoomPanSaved.y.value + e.translationY
      }
    })
    .onFinalize(() => {
      if (overlayScale.value <= 1.05) {
        overlayTranslateX.value = withSpring(0, ZOOM_SPRING)
        overlayTranslateY.value = withSpring(0, ZOOM_SPRING)
      }
    })

  // Compose: only pinch + zoom-pan (swipe is now scroll-driven, no pan gesture)
  const composedGesture = Gesture.Simultaneous(pinchGesture, zoomPanGesture)

  // --- Animated styles ---
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  // --- Reset on profile change ---
  useEffect(() => {
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    translateY.value = 0
    opacity.value = 1
    scrollY.value = 0
    scrollRef.current?.scrollTo?.({ y: 0, animated: false })
    messageSheetRef.current?.dismiss()
    detailSheetRef.current?.dismiss()
    // Notify parent header is visible
    onScrollStateChange?.({ scrollY: 0, isAtTop: true })
  }, [topProfile?.id])

  // --- Keyboard handling for message sheet ---
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener("keyboardWillShow", () => {
      if (messageSheetRef.current && messageSheetIndexRef.current >= 0) {
        messageSheetRef.current.snapToIndex(2)
      }
    })
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      if (messageSheetRef.current && messageSheetIndexRef.current >= 0) {
        messageSheetRef.current.snapToIndex(2)
      }
    })
    const keyboardWillHide = Keyboard.addListener("keyboardWillHide", () => {
      if (messageSheetRef.current && messageSheetIndexRef.current >= 0) {
        messageSheetRef.current.snapToIndex(0)
      }
    })
    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      if (messageSheetRef.current && messageSheetIndexRef.current >= 0) {
        messageSheetRef.current.snapToIndex(0)
      }
    })
    return () => {
      keyboardWillShow.remove()
      keyboardDidShow.remove()
      keyboardWillHide.remove()
      keyboardDidHide.remove()
    }
  }, [])

  // --- Handlers ---
  const handleCloseMessageSheet = useCallback(() => {
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    messageSheetRef.current?.dismiss()
  }, [])

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
        handleCloseMessageSheet()
        toast({ preset: "done", title: "Message sent" })
      } catch (error: any) {
        console.error("Error sending message:", error)
        toast({
          preset: "error",
          title: "Failed to send message",
          message: error?.message || "Please try again.",
        })
      }
    },
    [topProfile, sendMessageRequest, handleCloseMessageSheet, selectedPrompt, isImageChat],
  )

  const handleOpenImageChat = useCallback(() => {
    setIsImageChat(true)
    setSelectedPrompt(null)
    messageSheetRef.current?.present()
  }, [])

  const handlePromptPress = useCallback((title: string, answer: string) => {
    setSelectedPrompt({ title, answer })
    messageSheetRef.current?.present()
  }, [])

  const handleMessageSheetChange = useCallback((index: number) => {
    setMessageSheetIndex(index)
    messageSheetIndexRef.current = index
    if (index === -1) {
      setSelectedPrompt(null)
      setIsImageChat(false)
      setMessageText("")
    }
  }, [])

  const handleReportAndBlock = useCallback(() => {
    Alert.alert(
      "Report & Block",
      "Are you sure you want to report and block this person?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report & Block",
          style: "destructive",
          onPress: () => {
            if (topProfile) {
              onReportAndBlock?.(topProfile.id);
            }
          },
        },
      ],
    )
  }, [onReportAndBlock, topProfile])

  const handleOpenDetailSheet = useCallback(() => {
    detailSheetRef.current?.present()
  }, [])

  // --- Layout ---
  const [cardHeight, setCardHeight] = useState(0)
  const handleCardLayout = useCallback((e: any) => {
    setCardHeight(e.nativeEvent.layout.height)
  }, [])

  // Name row ~50px, swipe-down indicator ~30px, compact details ~110px,
  // swipe-up indicator ~50px, padding ~20px = ~260px non-photo content
  const NON_PHOTO_HEIGHT = 260
  const idealImageHeight = SCREEN_WIDTH * (1350 / 1080) - 30
  const effectiveImageHeight = cardHeight > 0
    ? Math.min(idealImageHeight, cardHeight - NON_PHOTO_HEIGHT)
    : idealImageHeight

  if (profiles.length === 0 || !topProfile) {
    return null
  }

  const distance = distances?.get(topProfile.id) ?? null
  const discoveryPrefs = topProfile.discovery_preferences as any
  const intents = (discoveryPrefs?.intents || []) as Intent[]
  const height = topProfile.height ?? discoveryPrefs?.height ?? null
  const distanceKm = formatDistanceKmRounded(distance)
  const formattedIntents = formatIntents(intents)

  return (
    <View style={styles.container}>
      <View style={styles.stackContainer}>
        {/* Front card */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.frontCard, animatedCardStyle]} onLayout={handleCardLayout}>
            <AnimatedGHScrollView
              ref={scrollRef as any}
              bounces
              alwaysBounceVertical
              showsVerticalScrollIndicator={false}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingBottom: 220 }}
            >
            {/* Name row */}
            <View style={styles.nameRow}>
              <ProfileHeader
                displayName={topProfile.display_name}
                age={topProfile.age}
                distanceKm={distanceKm}
                variant="compact"
              />
            </View>

            {/* Photo area (pinch-to-zoom ref target) */}
            <Animated.View
              ref={photoContainerRef}
              collapsable={false}
              style={[styles.photoWrapper, { height: effectiveImageHeight }]}
            >
              <View>
                <PhotoSection
                  ref={photoCarouselRef}
                  photos={topProfile.photo_urls}
                  imageHeight={effectiveImageHeight}
                  photoWidth={DISCOVER_PHOTO_WIDTH}
                  onOpenImageChat={handleOpenImageChat}
                  showPhotoSwipeTooltip={showPhotoSwipeTooltip}
                  showImageCommentTooltip={showImageCommentTooltip}
                  onPhotoSwipeTooltipClose={onPhotoSwipeTooltipClose}
                  onImageCommentTooltipClose={onImageCommentTooltipClose}
                />
              </View>

              {/* Photo overlays */}
              <View style={styles.imageTopOverlay}>
                <View style={styles.imageTopOverlayLeft} />
                <Pressable
                  onPress={handleReportAndBlock}
                  style={styles.reportBlockButton}
                >
                  <MoreHorizontal size={20} color={colors.foreground} />
                </Pressable>
              </View>

            </Animated.View>

            {/* Profile content — interleaved prompts + info */}
            <View style={styles.profileDetailSection}>
              {/* 1. Top prompt (most engaged) */}
              {prompt1 && (
                <PromptItem
                  title={prompt1.title}
                  answer={prompt1.answer}
                  onPress={() => handlePromptPress(prompt1.title, prompt1.answer)}
                  highlighted
                />
              )}

              {/* 2. Info box */}
              <ProfileInfoBox
                height={height}
                intent={formattedIntents}
                occupation={topProfile.occupation ?? null}
                city={profileGym?.city ?? null}
              />

              {/* 3. Prompt 2 */}
              {prompt2 && (
                <PromptItem
                  title={prompt2.title}
                  answer={prompt2.answer}
                  onPress={() => handlePromptPress(prompt2.title, prompt2.answer)}
                  highlighted
                />
              )}

              {/* 5. Lifestyle info box */}
              <ProfileLifestyleBox
                ethnicity={Array.isArray((topProfile as any).ethnicity) ? (topProfile as any).ethnicity : null}
                religion={(topProfile as any).religion ?? null}
                alcohol={(topProfile as any).alcohol ?? null}
                smoking={(topProfile as any).smoking ?? null}
                marijuana={(topProfile as any).marijuana ?? null}
                hasKids={(topProfile as any).has_kids ?? null}
              />

              {/* 6. Prompt 3 */}
              {prompt3 && (
                <PromptItem
                  title={prompt3.title}
                  answer={prompt3.answer}
                  onPress={() => handlePromptPress(prompt3.title, prompt3.answer)}
                  highlighted
                />
              )}
            </View>
            </AnimatedGHScrollView>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Profile detail sheet */}
      <ProfileDetailSheet
        profile={topProfile}
        profileGym={profileGym}
        distance={distance}
        prompts={prompts}
        onPromptPress={handlePromptPress}
        bottomSheetRef={detailSheetRef}
      />

      {/* Message sheet */}
      <MessageBottomSheet
        bottomSheetRef={messageSheetRef}
        selectedPrompt={selectedPrompt}
        isImageChat={isImageChat}
        messageText={messageText}
        profileName={topProfile.display_name}
        snapPoints={messageSnapPoints}
        bottomSheetIndex={messageSheetIndex}
        onMessageTextChange={setMessageText}
        onClose={handleCloseMessageSheet}
        onSend={handleSendMessage}
        onChange={handleMessageSheetChange}
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
    overflow: "hidden",
  },
  frontCard: {
    flex: 1,
    zIndex: 1,
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: "hidden",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    backgroundColor: colors.card,
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
  profileDetailSection: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[4],
  },
})
