import type { FitnessDiscipline } from '@/types/onboarding';
import { colors } from '@/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

interface FitnessIconProps {
  size?: number;
  color?: string;
}

const defaultIconColor = colors.foreground;

export const BodybuildingIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="arm-flex" size={size} color={color} />
);

export const PowerliftingIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="weight-lifter" size={size} color={color} />
);

export const CrossfitIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="fire" size={size} color={color} />
);

export const OlympicIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="medal" size={size} color={color} />
);

export const FunctionalIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="dumbbell" size={size} color={color} />
);

export const YogaIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="yoga" size={size} color={color} />
);

export const RunningIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="run-fast" size={size} color={color} />
);

export const SportsIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="soccer" size={size} color={color} />
);

export const GeneralIcon = ({ size = 24, color = defaultIconColor }: FitnessIconProps) => (
  <MaterialCommunityIcons name="human-handsup" size={size} color={color} />
);

/**
 * Get the appropriate fitness icon component for a given discipline
 */
export function getFitnessIcon(discipline: FitnessDiscipline): React.ComponentType<FitnessIconProps> {
  const iconMap: Record<FitnessDiscipline, React.ComponentType<FitnessIconProps>> = {
    bodybuilding: BodybuildingIcon,
    powerlifting: PowerliftingIcon,
    crossfit: CrossfitIcon,
    olympic: OlympicIcon,
    functional: FunctionalIcon,
    yoga: YogaIcon,
    running: RunningIcon,
    sports: SportsIcon,
    general: GeneralIcon,
  };

  return iconMap[discipline];
}
