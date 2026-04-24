import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { Image, Pressable, StyleSheet, View } from "react-native"
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated"

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

interface DiscoverActionBarProps {
  onSkip: () => void
  onCrush: () => void
  onLike: () => void
  disabled?: boolean
  /** Shared scroll offset (pt) used to drive visual intensification. */
  scrollY?: SharedValue<number>
}

/** Scroll distance (pt) over which the backdrop ramps from subtle → sharp. */
const RAMP_DISTANCE = 300

export function DiscoverActionBar({
  onSkip,
  onCrush,
  onLike,
  disabled = false,
  scrollY,
}: DiscoverActionBarProps) {
  const intensity = useDerivedValue(() => {
    if (!scrollY) return 1
    const y = scrollY.value
    return Math.max(0, Math.min(1, y / RAMP_DISTANCE))
  })

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intensity.value, [0, 1], [0.4, 1]),
  }))

  const buttonRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intensity.value, [0, 1], [0.85, 1]),
  }))

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: interpolate(intensity.value, [0, 1], [0, 45]),
  }))

  return (
    <View
      style={styles.container}
      pointerEvents={disabled ? "none" : "box-none"}
    >
      <AnimatedBlurView
        tint="dark"
        style={styles.blurLayer}
        animatedProps={blurAnimatedProps}
      />
      <Animated.View
        style={[styles.gradientLayer, gradientStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[styles.buttonRow, buttonRowStyle]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onSkip}
          style={({ pressed }) => [
            styles.button,
            styles.xButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Skip"
        >
          <Image
            source={require("../../assets/images/x-button.png")}
            style={styles.xIcon}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          onPress={onCrush}
          style={({ pressed }) => [
            styles.button,
            styles.gemButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Crush signal"
        >
          <Image
            source={require("../../assets/images/gem-button.png")}
            style={styles.gemIcon}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          onPress={onLike}
          style={({ pressed }) => [
            styles.button,
            styles.heartButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Like"
        >
          <Image
            source={require("../../assets/images/heart-button.png")}
            style={styles.heartIcon}
            resizeMode="contain"
          />
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 130,
    zIndex: 11,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  xButton: {
    width: 120,
    height: 120,
  },
  gemButton: {
    width: 100,
    height: 100,
  },
  heartButton: {
    width: 140,
    height: 140,
  },
  xIcon: {
    width: 120,
    height: 120,
  },
  gemIcon: {
    width: 100,
    height: 100,
  },
  heartIcon: {
    width: 140,
    height: 140,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
})
