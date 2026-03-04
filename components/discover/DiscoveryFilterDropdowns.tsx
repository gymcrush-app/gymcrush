import { FilterRangeSlider } from '@/components/ui/FilterRangeSlider';
import { FilterSlider } from '@/components/ui/FilterSlider';
import { FITNESS_DISCIPLINES, MAX_DISTANCE_MILES } from '@/constants';
import { milesToKm } from '@/lib/utils/locale';
import type { FitnessDiscipline } from '@/types/onboarding';
import { borderRadius, colors, fontSize, spacing } from '@/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface DiscoveryFilterValues {
  ageRange: [number, number] | null;
  distance: number | null;
  workoutTypes: FitnessDiscipline[];
}

export interface DiscoveryFilterDropdownsProps {
  distance: number | null;
  ageRange: [number, number] | null;
  workoutTypes: FitnessDiscipline[];
  onFiltersChange: (filters: DiscoveryFilterValues) => void;
  onOpenDistanceSlider?: () => void;
  onOpenAgeRangeSlider?: () => void;
  onOpenWorkoutTypesSheet?: () => void;
  distanceMinKm?: number;
  distanceMaxKm?: number;
}

const DEFAULT_DISTANCE_MIN_KM = 0;
const DEFAULT_DISTANCE_MAX_KM = Math.round(milesToKm(MAX_DISTANCE_MILES));

export function DiscoveryFilterDropdowns({ distance, ageRange, workoutTypes, onFiltersChange, onOpenDistanceSlider, onOpenAgeRangeSlider, onOpenWorkoutTypesSheet, distanceMinKm = DEFAULT_DISTANCE_MIN_KM, distanceMaxKm = DEFAULT_DISTANCE_MAX_KM }: DiscoveryFilterDropdownsProps) {
  const handleAgeRangeChange = (value: [number, number] | null) => {
    onFiltersChange({
      ageRange: value,
      distance,
      workoutTypes,
    });
  };

  const handleDistanceChange = (value: number | null) => {
    onFiltersChange({
      ageRange,
      distance: value,
      workoutTypes,
    });
  };

  return (
    <View style={styles.container}>
      {/* Age Range Filter */}
      <View style={styles.filterItem}>
        <FilterRangeSlider
          value={ageRange}
          onValueChange={handleAgeRangeChange}
          min={18}
          max={65}
          label="Age"
          onOpen={onOpenAgeRangeSlider}
        />
      </View>

      {/* Distance Filter */}
      <View style={styles.filterItem}>
        <FilterSlider
          value={distance}
          onValueChange={handleDistanceChange}
          min={distanceMinKm}
          max={distanceMaxKm}
          unit="km"
          label="Distance"
          onOpen={onOpenDistanceSlider}
        />
      </View>

      {/* Workout Types - Button only, active when selected */}
      <View style={styles.filterItem}>
        <Pressable
          onPress={() => onOpenWorkoutTypesSheet?.()}
          style={[
            styles.workoutButton,
            workoutTypes.length > 0 && styles.workoutButtonActive,
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text
            style={[
              styles.workoutButtonText,
              workoutTypes.length > 0 ? styles.workoutButtonTextActive : styles.workoutButtonTextPlaceholder,
            ]}
          >
            Workouts
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  filterItem: {
    flex: 1,
  },
  distanceFilterContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  workoutButton: {
    backgroundColor: colors.input,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  workoutButtonActive: {
    borderColor: colors.primary,
  },
  workoutButtonText: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  workoutButtonTextActive: {
    color: colors.foreground,
  },
  workoutButtonTextPlaceholder: {
    color: colors.mutedForeground,
  },
});
