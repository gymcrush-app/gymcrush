import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { Image, Pressable, StyleSheet, View } from "react-native"

interface DiscoverActionBarProps {
  onSkip: () => void
  onCrush: () => void
  onLike: () => void
  disabled?: boolean
}

export function DiscoverActionBar({
  onSkip,
  onCrush,
  onLike,
  disabled = false,
}: DiscoverActionBarProps) {
  return (
    <View
      style={styles.container}
      pointerEvents={disabled ? "none" : "box-none"}
    >
      <BlurView intensity={30} tint="dark" style={styles.blurLayer} />
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
        style={styles.gradientLayer}
        pointerEvents="none"
      />
      <View style={styles.buttonRow} pointerEvents="box-none">
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
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
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
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  xButton: {
    width: 64,
    height: 64,
  },
  gemButton: {
    width: 56,
    height: 56,
  },
  heartButton: {
    width: 72,
    height: 72,
  },
  xIcon: {
    width: 64,
    height: 64,
  },
  gemIcon: {
    width: 56,
    height: 56,
  },
  heartIcon: {
    width: 72,
    height: 72,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
})
