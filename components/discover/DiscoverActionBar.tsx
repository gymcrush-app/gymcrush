import { colors } from "@/theme"
import { BlurView } from "expo-blur"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import React, { useCallback } from "react"
import { Image, Pressable, StyleSheet, View } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
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

const TAP_PRESS_SPRING = { damping: 14, stiffness: 320, mass: 0.6 }
const TAP_RELEASE_SPRING = { damping: 8, stiffness: 220, mass: 0.7 }
const GLOW_DURATION_IN = 180
const GLOW_DURATION_OUT = 360

interface FabButtonProps {
  onPress: () => void
  source: number
  buttonStyle: any
  iconStyle: any
  glowColor: string
  hapticStyle: Haptics.ImpactFeedbackStyle
  accessibilityLabel: string
}

function FabButton({
  onPress,
  source,
  buttonStyle,
  iconStyle,
  glowColor,
  hapticStyle,
  accessibilityLabel,
}: FabButtonProps) {
  const scale = useSharedValue(1)
  const glow = useSharedValue(0)

  const handlePress = useCallback(() => {
    Haptics.impactAsync(hapticStyle)
    cancelAnimation(scale)
    cancelAnimation(glow)
    scale.value = withSequence(
      withSpring(0.88, TAP_PRESS_SPRING),
      withSpring(1, TAP_RELEASE_SPRING),
    )
    glow.value = withSequence(
      withTiming(1, { duration: GLOW_DURATION_IN, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: GLOW_DURATION_OUT, easing: Easing.in(Easing.quad) }),
    )
    onPress()
  }, [onPress, scale, glow, hapticStyle])

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.9,
    transform: [{ scale: 1 + glow.value * 0.35 }],
  }))

  return (
    <Animated.View style={[styles.fabContainer, animatedButtonStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.glowRing, { borderColor: glowColor }, animatedGlowStyle]}
      />
      <Pressable
        onPress={handlePress}
        style={[styles.button, buttonStyle]}
        hitSlop={8}
        accessibilityLabel={accessibilityLabel}
      >
        <Image source={source} style={iconStyle} resizeMode="contain" />
      </Pressable>
    </Animated.View>
  )
}

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
        <FabButton
          onPress={onSkip}
          source={require("../../assets/images/x-button.png")}
          buttonStyle={styles.xButton}
          iconStyle={styles.xIcon}
          glowColor="rgba(255, 122, 122, 0.7)"
          hapticStyle={Haptics.ImpactFeedbackStyle.Light}
          accessibilityLabel="Skip"
        />
        <FabButton
          onPress={onCrush}
          source={require("../../assets/images/gem-button.png")}
          buttonStyle={styles.gemButton}
          iconStyle={styles.gemIcon}
          glowColor="rgba(140, 200, 255, 0.8)"
          hapticStyle={Haptics.ImpactFeedbackStyle.Light}
          accessibilityLabel="Crush signal"
        />
        <FabButton
          onPress={onLike}
          source={require("../../assets/images/heart-button.png")}
          buttonStyle={styles.heartButton}
          iconStyle={styles.heartIcon}
          glowColor={colors.primary}
          hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
          accessibilityLabel="Like"
        />
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
    height: 80,
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
    gap: 20,
  },
  fabContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 999,
    borderWidth: 3,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  xButton: {
    width: 70,
    height: 70,
  },
  gemButton: {
    width: 50,
    height: 50,
  },
  heartButton: {
    width: 70,
    height: 70,
  },
  xIcon: {
    width: 70,
    height: 70,
  },
  gemIcon: {
    width: 50,
    height: 50,
  },
  heartIcon: {
    width: 70,
    height: 70,
  },
})
