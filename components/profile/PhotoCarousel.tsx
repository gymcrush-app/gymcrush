import { borderRadius, colors, spacing } from "@/theme"
import { Image } from "expo-image"
import React, { useCallback, useRef, useState } from "react"
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  measure,
  runOnJS,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

interface PhotoCarouselProps {
  photos: string[]
  height?: number
  /** Width of each photo page (default SCREEN_WIDTH). Use for inset discover layout. */
  width?: number
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4

interface ZoomableImageProps {
  uri: string
  width: number
  height: number
  onZoomStart?: (data: { uri: string; layout: { x: number; y: number; width: number; height: number } }) => void
  onZoomEnd?: () => void
  overlayScale?: SharedValue<number>
}

function ZoomableImage({
  uri,
  width,
  height,
  onZoomStart,
  onZoomEnd,
  overlayScale,
}: ZoomableImageProps) {
  const containerRef = useAnimatedRef<Animated.View>()
  const scaleSaved = useSharedValue(1)
  const scale = useSharedValue(1)
  const isZooming = useSharedValue(0)

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(scale)
      scaleSaved.value = scale.value

      if (overlayScale && onZoomStart) {
        const measured = measure(containerRef)
        if (measured) {
          isZooming.value = 1
          runOnJS(onZoomStart)({
            uri,
            layout: {
              x: measured.pageX,
              y: measured.pageY,
              width: measured.width,
              height: measured.height,
            },
          })
        }
      }
    })
    .onUpdate((e) => {
      const next = scaleSaved.value * e.scale
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))

      if (overlayScale && isZooming.value === 1) {
        overlayScale.value = clamped
        // Hold local scale at 1 so the clipped version doesn't show
        scale.value = 1
      } else {
        scale.value = clamped
      }
    })
    .onFinalize(() => {
      scaleSaved.value = 1

      if (overlayScale && isZooming.value === 1) {
        isZooming.value = 0
        // Don't reset overlayScale here — parent animates it back via onZoomEnd
        if (onZoomEnd) {
          runOnJS(onZoomEnd)()
        }
      }

      scale.value = withSpring(1, {
        damping: 40,
        stiffness: 300,
      })
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View
      ref={containerRef}
      style={{ width, height, overflow: "hidden" }}
      collapsable={false}
    >
      <GestureDetector gesture={pinchGesture}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Image
            source={{ uri }}
            style={{ width, height }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 400,
    width: SCREEN_WIDTH,
  },
  paginationContainer: {
    position: "absolute",
    bottom: spacing[1],
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[2],
  },
  paginationDot: {
    borderRadius: borderRadius.full,
  },
  tapZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
  },
  tapZoneLeft: {
    left: 0,
  },
  tapZoneRight: {
    right: 0,
  },
})

export function PhotoCarousel({
  photos,
  height = 400,
  width = SCREEN_WIDTH,
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollViewRef = useRef<ScrollView>(null)

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(contentOffsetX / width)
    setCurrentIndex(index)
  }

  const goToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(photos.length - 1, index))
      scrollViewRef.current?.scrollTo({ x: clamped * width, animated: true })
      setCurrentIndex(clamped)
    },
    [photos.length, width],
  )

  if (photos.length === 0) {
    return null
  }

  return (
    <View style={[styles.container, { height, width }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {photos.map((photo, index) => (
          <ZoomableImage
            key={index}
            uri={photo}
            width={width}
            height={height}
          />
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <>
          <Pressable
            style={[styles.tapZone, styles.tapZoneLeft]}
            onPress={() => goToIndex(currentIndex - 1)}
          />
          <Pressable
            style={[styles.tapZone, styles.tapZoneRight]}
            onPress={() => goToIndex(currentIndex + 1)}
          />
        </>
      )}

      {/* Pagination Dots */}
      {photos.length > 1 && (
        <View style={styles.paginationContainer}>
          {photos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  width: index === currentIndex ? 8 : 6,
                  height: index === currentIndex ? 8 : 6,
                  backgroundColor:
                    index === currentIndex
                      ? colors.primary
                      : "rgba(255, 255, 255, 0.5)",
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )
}
