// TODO: ProfileCard
// Full-screen profile card component displaying a user's complete profile
// Props: interface ProfileCardProps { profile: Profile; onPress?: () => void }
// Layout: Full-screen card with:
//   - PhotoCarousel at top (full width, aspect ratio ~3:4)
//   - LinearGradient overlay using gradients.cardOverlay (from bottom to top)
//   - Profile info overlay at bottom: name, age, gym name, bio (if exists)
//   - FitnessBadges row below photo carousel
//   - ApproachBadge if approach_prompt exists (displayed prominently)
// Styling: Use bg-card rounded-3xl for card container, shadows.card for elevation
// Use PhotoCarousel, FitnessBadges, ApproachBadge components
// Text colors: text-card-foreground for overlay text
// Gradient overlay should be semi-transparent to maintain photo visibility

import React from 'react';
import { View, Text } from 'react-native';
import type { Profile } from '@/types';

interface ProfileCardProps {
  profile: Profile;
  onPress?: () => void;
}

export function ProfileCard({ profile, onPress }: ProfileCardProps) {
  // TODO: Implement ProfileCard component
  return (
    <View>
      <Text>{profile.display_name}</Text>
    </View>
  );
}
