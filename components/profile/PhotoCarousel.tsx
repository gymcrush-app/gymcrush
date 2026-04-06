import { useZoomPortalOptional } from "@/lib/contexts/ZoomPortalContext"
import { borderRadius, colors, spacing } from "@/theme"
import { Image } from "expo-image"
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  measure,
  runOnJS,
  useAnimatedRef,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

const ZOOM_SPRING = { damping: 40, stiffness: 300 }
const MIN_ZOOM = 1
const MAX_ZOOM = 4

export interface PhotoCarouselRef {
  getCurrentPhotoUri(): string | undefined
}

interface PhotoCarouselProps {
  photos: string[]
  height?: number
  /** Width of each photo page (default SCREEN_WIDTH). Use for inset discover layout. */
  width?: number
  /** Enable pinch-to-zoom (requires ZoomPortalProvider ancestor). Default false. */
  enableZoom?: boolean
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
    width: "50%",
  },
  tapZoneLeft: {
    left: 0,
  },
  tapZoneRight: {
    right: 0,
  },
})

export const PhotoCarousel = forwardRef<PhotoCarouselRef, PhotoCarouselProps>(
  function PhotoCarousel({ photos, height = 400, width = SCREEN_WIDTH, enableZoom = false }, ref) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const scrollViewRef = useRef<ScrollView>(null)
    const containerRef = useAnimatedRef<Animated.View>()

    // Zoom portal — null when no ZoomPortalProvider ancestor or enableZoom is false
    const zoomCtx = useZoomPortalOptional()
    const zoom = enableZoom ? zoomCtx : null
    const zoomScaleSaved = useSharedValue(1)
    const zoomPanSavedX = useSharedValue(0)
    const zoomPanSavedY = useSharedValue(0)

    useImperativeHandle(ref, () => ({
      getCurrentPhotoUri() {
        return photos[currentIndex]
      },
    }))

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

    const startZoomWithCurrentPhoto = useCallback(
      (layout: { x: number; y: number; width: number; height: number }) => {
        const uri = photos[currentIndex]
        if (uri && zoom) {
          zoom.startZoom({ uri, layout })
        }
      },
      [zoom, photos, currentIndex],
    )

    // Build pinch + pan gestures when zoom is enabled
    const pinchGesture = React.useMemo(() => {
      if (!zoom) return null
      const { overlayScale, overlayTranslateX, overlayTranslateY, isZoomed, endZoom } = zoom

      const pinch = Gesture.Pinch()
        .onStart(() => {
          cancelAnimation(overlayScale)
          zoomScaleSaved.value = overlayScale.value > 1 ? overlayScale.value : 1
          try {
            const measured = measure(containerRef)
            if (measured) {
              runOnJS(startZoomWithCurrentPhoto)({
                x: measured.pageX,
                y: measured.pageY,
                width: measured.width,
                height: measured.height,
              })
            }
          } catch {
            // View not yet laid out
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

      const pan = Gesture.Pan()
        .minPointers(1)
        .maxPointers(2)
        .onStart(() => {
          zoomPanSavedX.value = overlayTranslateX.value
          zoomPanSavedY.value = overlayTranslateY.value
        })
        .onUpdate((e) => {
          if (isZoomed.value) {
            overlayTranslateX.value = zoomPanSavedX.value + e.translationX
            overlayTranslateY.value = zoomPanSavedY.value + e.translationY
          }
        })
        .onFinalize(() => {
          if (overlayScale.value <= 1.05) {
            overlayTranslateX.value = withSpring(0, ZOOM_SPRING)
            overlayTranslateY.value = withSpring(0, ZOOM_SPRING)
          }
        })

      return Gesture.Simultaneous(pinch, pan)
    }, [zoom, containerRef, startZoomWithCurrentPhoto])

    if (photos.length === 0) {
      return null
    }

    const content = (
      <Animated.View ref={containerRef} collapsable={false} style={[styles.container, { height, width }]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={{ width, height }}
              contentFit="cover"
              cachePolicy="memory-disk"
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
      </Animated.View>
    )

    if (pinchGesture) {
      return <GestureDetector gesture={pinchGesture}>{content}</GestureDetector>
    }

    return content
  },
)
