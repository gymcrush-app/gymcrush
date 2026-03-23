import { colors } from "@/theme"
import { Image } from "expo-image"
import React, { createContext, useCallback, useContext, useState } from "react"
import { Dimensions, StyleSheet, View } from "react-native"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

const ZOOM_BACKDROP_MAX_OPACITY = 0.9
const ZOOM_SPRING_CONFIG = { damping: 40, stiffness: 300 }

interface ZoomLayout {
  x: number
  y: number
  width: number
  height: number
}

interface ZoomPortalState {
  uri: string
  layout: ZoomLayout
}

interface ZoomPortalContextValue {
  /** Shared value for the current pinch scale — written by ZoomableImage on UI thread */
  overlayScale: SharedValue<number>
  /** Call once on pinch start to show the portal image */
  startZoom: (state: ZoomPortalState) => void
  /** Call once on pinch end to animate back and dismiss */
  endZoom: () => void
}

const ZoomPortalContext = createContext<ZoomPortalContextValue | null>(null)

export function useZoomPortal() {
  const ctx = useContext(ZoomPortalContext)
  if (!ctx) throw new Error("useZoomPortal must be used within ZoomPortalProvider")
  return ctx
}

export function ZoomPortalProvider({ children }: { children: React.ReactNode }) {
  const overlayScale = useSharedValue(1)
  const layoutX = useSharedValue(0)
  const layoutY = useSharedValue(0)
  const layoutW = useSharedValue(0)
  const layoutH = useSharedValue(0)

  const [portal, setPortal] = useState<ZoomPortalState | null>(null)

  const startZoom = useCallback((state: ZoomPortalState) => {
    layoutX.value = state.layout.x
    layoutY.value = state.layout.y
    layoutW.value = state.layout.width
    layoutH.value = state.layout.height
    setPortal(state)
  }, [])

  const endZoom = useCallback(() => {
    overlayScale.value = withSpring(1, ZOOM_SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(setPortal)(null)
      }
    })
  }, [])

  const backdropStyle = useAnimatedStyle(() => {
    if (overlayScale.value <= 1) return { opacity: 0 }
    const progress = Math.min(1, (overlayScale.value - 1) / 2)
    return { opacity: progress * ZOOM_BACKDROP_MAX_OPACITY }
  })

  const imageStyle = useAnimatedStyle(() => {
    const w = layoutW.value
    const h = layoutH.value
    if (w === 0 || h === 0) {
      return {
        position: "absolute" as const,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        transform: [{ scale: 1 }],
        opacity: 0,
      }
    }

    const s = overlayScale.value

    return {
      position: "absolute" as const,
      left: layoutX.value,
      top: layoutY.value,
      width: w,
      height: h,
      transform: [
        // Translate so the scale origin is the center of the image
        { translateX: 0 },
        { translateY: 0 },
        { scale: s },
      ],
      opacity: s > 1 ? 1 : 0,
    }
  })

  const contextValue: ZoomPortalContextValue = {
    overlayScale,
    startZoom,
    endZoom,
  }

  return (
    <ZoomPortalContext.Provider value={contextValue}>
      {children}
      {portal && (
        <View style={styles.portalContainer} pointerEvents="none">
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
          />
          <Animated.View style={imageStyle}>
            <Image
              source={{ uri: portal.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        </View>
      )}
    </ZoomPortalContext.Provider>
  )
}

const styles = StyleSheet.create({
  portalContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdrop: {
    backgroundColor: "black",
  },
})
