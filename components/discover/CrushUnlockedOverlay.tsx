/**
 * Full-screen "CRUSH UNLOCKED" celebration overlay.
 * Peach radial burst → particle explosion → stylised text → fade out.
 */
import { fontFamily } from "@/theme"
import { palette } from "@/theme/colors"
import React, { useMemo } from "react"
import { Dimensions, StyleSheet, View } from "react-native"
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated"

const { width: SW, height: SH } = Dimensions.get("window")
const DIAGONAL = Math.sqrt(SW * SW + SH * SH)

// ─── Particle config ──────────────────────────────────────────────────
const PARTICLE_COUNT = 72
const PEACH = palette.peach100
const PEACH_LIGHT = palette.peach300
const PEACH_DARK = palette.peach200

function particleColor(i: number) {
  "worklet"
  if (i % 3 === 0) return PEACH
  if (i % 3 === 1) return PEACH_LIGHT
  return PEACH_DARK
}

// ─── Single particle ──────────────────────────────────────────────────
function Particle({
  progress,
  index,
}: {
  progress: SharedValue<number>
  index: number
}) {
  // Distribute evenly with slight jitter
  const angle =
    (index / PARTICLE_COUNT) * Math.PI * 2 + ((index * 137.5) % 360) * 0.01
  const radiusBase = 80 + (index % 7) * 45
  const radius = Math.min(radiusBase, DIAGONAL * 0.55)
  const size = 5 + (index % 5) * 2
  const isRect = index % 3 !== 0
  const color = particleColor(index)
  // Stagger: inner particles start earlier
  const stagger = (index % 5) * 0.04

  const style = useAnimatedStyle(() => {
    const p = progress.value
    const localP = Math.max(0, Math.min(1, (p - stagger) / (1 - stagger)))
    return {
      opacity: interpolate(
        localP,
        [0, 0.1, 0.5, 0.85, 1],
        [0, 1, 0.9, 0.4, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(localP, [0, 1], [0, Math.cos(angle) * radius]),
        },
        {
          translateY: interpolate(
            localP,
            [0, 1],
            [0, Math.sin(angle) * radius - 30],
          ),
        },
        {
          scale: interpolate(
            localP,
            [0, 0.15, 0.5, 1],
            [0.3, 1.4, 1, 0.3],
            Extrapolation.CLAMP,
          ),
        },
        {
          rotate: `${interpolate(localP, [0, 1], [0, (index % 2 === 0 ? 1 : -1) * 180])}deg`,
        },
      ],
    }
  })

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: isRect ? size * 1.6 : size,
          height: isRect ? size : size * 1.6,
          borderRadius: isRect ? 2 : size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  )
}

// ─── Expanding ring ───────────────────────────────────────────────────
function BurstRing({
  progress,
  delay,
  maxRadius,
}: {
  progress: SharedValue<number>
  delay: number
  maxRadius: number
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value
    const localP = Math.max(0, (p - delay) / (1 - delay))
    const r = interpolate(localP, [0, 1], [0, maxRadius], Extrapolation.CLAMP)
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      opacity: interpolate(
        localP,
        [0, 0.2, 0.6, 1],
        [0, 0.5, 0.25, 0],
        Extrapolation.CLAMP,
      ),
      borderWidth: interpolate(
        localP,
        [0, 0.5, 1],
        [12, 6, 1],
        Extrapolation.CLAMP,
      ),
    }
  })

  return <Animated.View style={[styles.ring, style]} />
}

// ─── Flash backdrop ───────────────────────────────────────────────────
function FlashBackdrop({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.08, 0.2, 0.6, 1],
      [0, 0.6, 0.35, 0.15, 0],
      Extrapolation.CLAMP,
    ),
  }))
  return <Animated.View style={[styles.flash, style]} />
}

// ─── Stylised text ────────────────────────────────────────────────────
const CRUSH_TEXT = "CRUSH"
const UNLOCKED_TEXT = "UNLOCKED"

function AnimatedLetter({
  char,
  index,
  total,
  progress,
  row,
}: {
  char: string
  index: number
  total: number
  progress: SharedValue<number>
  row: 0 | 1
}) {
  // Text appears after the burst is underway
  const textStart = 0.25
  const letterDelay = textStart + (index / total) * 0.15
  const rowDelay = row * 0.08

  const style = useAnimatedStyle(() => {
    const p = progress.value
    const localP = Math.max(
      0,
      Math.min(1, (p - letterDelay - rowDelay) / 0.3),
    )
    return {
      opacity: interpolate(localP, [0, 0.4, 1], [0, 1, 1], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(
            localP,
            [0, 0.5, 0.75, 1],
            [0.3, 1.15, 0.95, 1],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateY: interpolate(
            localP,
            [0, 0.5, 1],
            [20, -4, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }
  })

  // Fade out with the rest
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.75, 1],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }))

  return (
    <Animated.View style={fadeStyle}>
      <Animated.Text
        style={[
          styles.letter,
          row === 0 ? styles.crushLetter : styles.unlockedLetter,
          style,
        ]}
      >
        {char}
      </Animated.Text>
    </Animated.View>
  )
}

// ─── Main overlay ─────────────────────────────────────────────────────

interface CrushUnlockedOverlayProps {
  progress: SharedValue<number>
  active: boolean
}

export function CrushUnlockedOverlay({
  progress,
  active,
}: CrushUnlockedOverlayProps) {
  const particles = useMemo(
    () => Array.from({ length: PARTICLE_COUNT }, (_, i) => i),
    [],
  )

  if (!active) return null

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Full-screen peach flash */}
      <FlashBackdrop progress={progress} />

      {/* Expanding rings */}
      <View style={styles.center}>
        <BurstRing progress={progress} delay={0} maxRadius={DIAGONAL * 0.35} />
        <BurstRing progress={progress} delay={0.05} maxRadius={DIAGONAL * 0.5} />
        <BurstRing progress={progress} delay={0.1} maxRadius={DIAGONAL * 0.65} />
      </View>

      {/* Particle explosion */}
      <View style={styles.center}>
        {particles.map((i) => (
          <Particle key={i} progress={progress} index={i} />
        ))}
      </View>

      {/* Stylised text */}
      <View style={styles.textContainer}>
        <View style={styles.textRow}>
          {CRUSH_TEXT.split("").map((char, i) => (
            <AnimatedLetter
              key={`c-${i}`}
              char={char}
              index={i}
              total={CRUSH_TEXT.length}
              progress={progress}
              row={0}
            />
          ))}
        </View>
        <View style={styles.textRow}>
          {UNLOCKED_TEXT.split("").map((char, i) => (
            <AnimatedLetter
              key={`u-${i}`}
              char={char}
              index={i}
              total={UNLOCKED_TEXT.length}
              progress={progress}
              row={1}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.peach100,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderColor: palette.peach100,
  },
  particle: {
    position: "absolute",
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  textRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  crushLetter: {
    fontSize: 52,
    fontFamily: fontFamily.manropeExtrabold,
    color: "#fff",
    letterSpacing: 6,
    marginHorizontal: 2,
  },
  unlockedLetter: {
    fontSize: 28,
    fontFamily: fontFamily.manropeBold,
    color: palette.peach100,
    letterSpacing: 4,
    marginHorizontal: 1,
  },
})
