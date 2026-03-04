import { useGymById } from "@/lib/api/gyms"
import { useSendMessageRequest } from "@/lib/api/messages"
import { useProfile } from "@/lib/api/profiles"
import { calculateDistanceMiles, formatDistance } from "@/lib/utils/distance"
import { formatFitnessDisciplines, formatIntents } from "@/lib/utils/formatting"
import { borderRadius, colors, fontSize, spacing, swipe } from "@/theme"
import type { Profile, SwipeAction } from "@/types"
import type { FitnessDiscipline, Intent } from "@/types/onboarding"
import BottomSheet from "@gorhom/bottom-sheet"
import { toast } from "burnt"
import { useRouter } from "expo-router"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Dimensions,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import Tooltip from "react-native-walkthrough-tooltip"
import { AboutSection } from "./AboutSection"
import { MessageBottomSheet } from "./MessageBottomSheet"
import { PhotoSection } from "./PhotoSection"
import { ProfileHeader } from "./ProfileHeader"
import { ProfileInfoBox } from "./ProfileInfoBox"
import { PromptsList } from "./PromptsList"
import { SwipeIndicator } from "./SwipeIndicator"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

interface SwipeDeckProps {
  profiles: Profile[]
  onSwipe: (profileId: string, action: SwipeAction) => void
  currentUserGymId?: string | null
  showPhotoSwipeTooltip?: boolean
  showImageCommentTooltip?: boolean
  showSwipeDownTooltip?: boolean
  showSwipeUpTooltip?: boolean
  onPhotoSwipeTooltipClose?: () => void
  onImageCommentTooltipClose?: () => void
  onSwipeDownTooltipClose?: () => void
  onSwipeUpTooltipClose?: () => void
}

export function SwipeDeck({
  profiles,
  onSwipe,
  currentUserGymId,
  showPhotoSwipeTooltip = false,
  showImageCommentTooltip = false,
  showSwipeDownTooltip = false,
  showSwipeUpTooltip = false,
  onPhotoSwipeTooltipClose,
  onImageCommentTooltipClose,
  onSwipeDownTooltipClose,
  onSwipeUpTooltipClose,
}: SwipeDeckProps) {
  if (profiles.length === 0) {
    return null
  }

  const topProfile = profiles[0]
  const { data: currentUserProfile } = useProfile()
  const { data: profileGym } = useGymById(topProfile?.home_gym_id || "")
  const { data: currentUserGym } = useGymById(currentUserGymId || "")

  if (!topProfile) {
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
  const disciplines = topProfile.fitness_disciplines as FitnessDiscipline[]

  // Scroll position tracking
  const scrollViewRef = useRef<ScrollView>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [hasTriggeredInterested, setHasTriggeredInterested] = useState(false)
  const [hasTriggeredSkip, setHasTriggeredSkip] = useState(false)
  const [swipeUpTooltipVisible, setSwipeUpTooltipVisible] = useState(false)

  // Bottom sheet state
  const bottomSheetRef = useRef<BottomSheet>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<{
    title: string
    answer: string
  } | null>(null)
  const [isImageChat, setIsImageChat] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [bottomSheetIndex, setBottomSheetIndex] = useState(-1)
  const snapPoints = useMemo(() => ["50%", "90%"], [])

  // Reset trigger flags and scroll position when profile changes
  useEffect(() => {
    setHasTriggeredInterested(false)
    setHasTriggeredSkip(false)
    setScrollPosition(0)
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    setSwipeUpTooltipVisible(false)
    bottomSheetRef.current?.close()
    scrollViewRef.current?.scrollTo({ y: 0, animated: false })
  }, [topProfile.id])

  // When parent requests swipe-up tooltip, scroll to bottom first then show tooltip
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

  // Keyboard listeners for bottom sheet adjustment
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener("keyboardWillShow", () => {
      if (bottomSheetRef.current && bottomSheetIndex >= 0) {
        bottomSheetRef.current.snapToIndex(2) // Snap to 90%
      }
    })
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      if (bottomSheetRef.current && bottomSheetIndex >= 0) {
        bottomSheetRef.current.snapToIndex(2) // Snap to 90%
      }
    })
    const keyboardWillHide = Keyboard.addListener("keyboardWillHide", () => {
      if (bottomSheetRef.current && bottomSheetIndex >= 0) {
        bottomSheetRef.current.snapToIndex(0) // Snap to 50%
      }
    })
    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      if (bottomSheetRef.current && bottomSheetIndex >= 0) {
        bottomSheetRef.current.snapToIndex(0) // Snap to 50%
      }
    })

    return () => {
      keyboardWillShow.remove()
      keyboardDidShow.remove()
      keyboardWillHide.remove()
      keyboardDidHide.remove()
    }
  }, [bottomSheetIndex])

  // Vertical swipe gesture
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(1)

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      if (Math.abs(event.translationY) > Math.abs(event.translationX)) {
        translateY.value = event.translationY
        const progress = Math.abs(event.translationY) / 200
        opacity.value = Math.max(0, 1 - progress)
      }
    })
    .onEnd((event) => {
      const threshold = swipe.threshold
      const velocity = event.velocityY

      if (
        Math.abs(event.translationY) > threshold ||
        Math.abs(velocity) > swipe.velocityThreshold
      ) {
        if (event.translationY > 0 || velocity > 0) {
          runOnJS(onSwipe)(topProfile.id, "pass")
        } else {
          runOnJS(onSwipe)(topProfile.id, "like")
        }
      } else {
        translateY.value = withSpring(0)
        opacity.value = withSpring(1)
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  // Scroll handlers
  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent
      const currentScrollY = contentOffset.y
      const scrollBottom = currentScrollY + layoutMeasurement.height
      const pastBottom = scrollBottom - contentSize.height

      setScrollPosition(currentScrollY)

      if (currentScrollY > 10 && hasTriggeredInterested) {
        setHasTriggeredInterested(false)
      }
      if (currentScrollY > -10 && hasTriggeredSkip) {
        setHasTriggeredSkip(false)
      }

      if (pastBottom >= 50 && !hasTriggeredInterested) {
        setHasTriggeredInterested(true)
        onSwipe(topProfile.id, "like")
      }

      if (currentScrollY < -120 && !hasTriggeredSkip) {
        setHasTriggeredSkip(true)
        scrollViewRef.current?.scrollTo({ y: 0, animated: true })
        onSwipe(topProfile.id, "pass")
      }
    },
    [hasTriggeredInterested, hasTriggeredSkip, onSwipe, topProfile.id],
  )

  // Mock prompt data
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

  // Bottom sheet handlers
  const handleCloseBottomSheet = useCallback(() => {
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    bottomSheetRef.current?.close()
  }, [])

  const router = useRouter()
  const sendMessageRequest = useSendMessageRequest()

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !topProfile) return

    try {
      await sendMessageRequest.mutateAsync({
        toUserId: topProfile.id,
        content: messageText.trim(),
        ...(selectedPrompt
          ? {
              reactionType: 'prompt' as const,
              reactionPromptTitle: selectedPrompt.title,
              reactionPromptAnswer: selectedPrompt.answer,
            }
          : isImageChat
            ? {
                reactionType: 'image' as const,
                reactionImageUrl:
                  topProfile.photo_urls?.[0] ?? undefined,
              }
            : {}),
      })

      toast({
        preset: "done",
        title: "Message sent!",
        message: `Your message to ${topProfile.display_name} has been sent.`,
      })

      handleCloseBottomSheet()

      // Navigate to chat tab after sending
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
  }, [
    messageText,
    topProfile,
    sendMessageRequest,
    handleCloseBottomSheet,
    router,
    selectedPrompt,
    isImageChat,
  ])

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

  const imageHeight = SCREEN_WIDTH * 0.75

  // Format data for sub-components
  const formattedIntents = formatIntents(intents)
  const formattedDisciplines = formatFitnessDisciplines(disciplines)
  const formattedDistance = formatDistance(distance)

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
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
            <PhotoSection
              photos={topProfile.photo_urls}
              imageHeight={imageHeight}
              onOpenImageChat={handleOpenImageChat}
              showPhotoSwipeTooltip={showPhotoSwipeTooltip}
              showImageCommentTooltip={showImageCommentTooltip}
              onPhotoSwipeTooltipClose={onPhotoSwipeTooltipClose}
              onImageCommentTooltipClose={onImageCommentTooltipClose}
            />

            <Tooltip
              isVisible={showSwipeDownTooltip}
              content={
                <View
                  style={{
                    backgroundColor: colors.card,
                    padding: spacing[3],
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: fontSize.base,
                    }}
                  >
                    Swipe down or pull up to pass on this profile
                  </Text>
                </View>
              }
              placement="top"
              onClose={onSwipeDownTooltipClose}
              backgroundColor="rgba(0,0,0,0.5)"
            >
              <View
                style={{
                  width: "100%",
                }}
              >
                <SwipeIndicator direction="down" text="Swipe down to pass" />
              </View>
            </Tooltip>

            <View style={styles.contentSection}>
              <ProfileHeader
                displayName={topProfile.display_name}
                age={topProfile.age}
              />

              <ProfileInfoBox
                intents={formattedIntents}
                disciplines={formattedDisciplines}
                distance={formattedDistance}
              />

              <AboutSection bio={topProfile.bio} />

              <PromptsList
                prompts={mockPrompts}
                onPromptPress={handlePromptPress}
              />

              <Tooltip
                isVisible={swipeUpTooltipVisible}
                content={
                  <View
                    style={{
                      backgroundColor: colors.card,
                      padding: spacing[3],
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: fontSize.base,
                      }}
                    >
                      Swipe up or scroll to bottom to like this profile
                    </Text>
                  </View>
                }
                placement="bottom"
                onClose={onSwipeUpTooltipClose}
                backgroundColor="rgba(0,0,0,0.5)"
              >
                <SwipeIndicator
                  direction="up"
                  text={`Swipe up to match with ${topProfile.display_name}`}
                  containerStyle="up"
                />
              </Tooltip>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>

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
  scrollView: {
    flex: 1,
  },
  contentSection: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
  },
})
