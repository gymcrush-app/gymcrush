// TODO: SwipeCard
// Swipeable profile card using react-native-gesture-handler PanGesture + Reanimated
// Props: interface SwipeCardProps { profile: Profile; onSwipe: (action: SwipeAction) => void }
// Layout: Full-screen card with PhotoCarousel, gradient overlay (gradients.cardOverlay),
//   name/age/gym text, FitnessBadges, and ApproachBadge if approach_prompt exists
// Gesture: Pan horizontal, threshold from swipe.threshold (120px), rotation from swipe.rotationFactor
// Like indicator: green overlay with heart icon, Pass: red overlay with X
// Crush: special gold/peach animation using gradients.primary
// Use shadows.card for card elevation, rounded-3xl for corners
// Animated styles: translateX, rotate (from swipe.rotationFactor), opacity
// On swipe threshold exceeded, trigger onSwipe callback and animate card off screen
// Use useAnimatedGestureHandler, useAnimatedStyle, withSpring for animations

import React from 'react';
import { View } from 'react-native';
import type { Profile, SwipeAction } from '@/types';

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (action: SwipeAction) => void;
}

export function SwipeCard({ profile, onSwipe }: SwipeCardProps) {
  // TODO: Implement SwipeCard component with PanGesture and Reanimated
  return (
    <View>
      {/* Card content */}
    </View>
  );
}
