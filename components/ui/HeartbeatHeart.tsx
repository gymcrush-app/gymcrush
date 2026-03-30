import { colors } from '@/theme';
import { Image as RNImage, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import React, { useEffect } from 'react';

const GYM_CRUSH_HEART_IMAGE = require('@/assets/images/GymCrushHeart.png');

interface HeartbeatHeartProps {
  size?: number;
  active?: boolean;
}

export function HeartbeatHeart({ size = 96, active = true }: HeartbeatHeartProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }

    // Double beat followed by a resting phase.
    scale.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.1, { duration: 140, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 760, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [active, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.18 }],
    opacity: 0.22 - (scale.value - 1) * 0.35,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size * 0.86,
            height: size * 0.86,
            borderRadius: size,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={pulseStyle}>
        <RNImage
          source={GYM_CRUSH_HEART_IMAGE}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
});
