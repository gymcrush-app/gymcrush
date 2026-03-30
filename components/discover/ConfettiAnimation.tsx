import { colors } from '@/theme';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedG = Animated.createAnimatedComponent(G);

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
}

const CONFETTI_COLORS = [
  colors.primary,
  colors.secondary,
  colors.accent,
  '#FFD700', // Gold
  '#FF6B9D', // Pink
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
];

const PARTICLE_COUNT = 50;

function generateParticles(): ConfettiParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    y: -20,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 500,
  }));
}

interface ConfettiAnimationProps {
  active: boolean;
}

export function ConfettiAnimation({ active }: ConfettiAnimationProps) {
  const particles = React.useMemo(() => generateParticles(), []);

  if (!active) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFillObject}>
        {particles.map((particle) => (
          <ConfettiParticleItem key={particle.id} particle={particle} />
        ))}
      </Svg>
    </View>
  );
}

interface ConfettiParticleItemProps {
  particle: ConfettiParticle;
}

function ConfettiParticleItem({ particle }: ConfettiParticleItemProps) {
  const translateY = useSharedValue(particle.y);
  const translateX = useSharedValue(particle.x);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Random horizontal drift
    const horizontalDrift = (Math.random() - 0.5) * 200;
    
    // Animate falling
    translateY.value = withDelay(
      particle.delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration: 2000 + Math.random() * 1000,
        easing: Easing.out(Easing.quad),
      })
    );

    // Animate horizontal movement
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.x + horizontalDrift, {
        duration: 2000 + Math.random() * 1000,
        easing: Easing.inOut(Easing.sin),
      })
    );

    // Animate rotation
    rotation.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(360, {
          duration: 1000 + Math.random() * 500,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    // Fade out near the bottom
    opacity.value = withDelay(
      particle.delay + 1500,
      withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.quad),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  return (
    // @ts-expect-error AnimatedG from react-native-svg accepts style from Reanimated but typings omit it
    <AnimatedG style={animatedStyle}>
      <Circle
        cx={0}
        cy={0}
        r={particle.size / 2}
        fill={particle.color}
      />
    </AnimatedG>
  );
}
