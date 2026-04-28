import { FilterRangeSlider } from "@/components/ui/FilterRangeSlider"
import { FilterSlider } from "@/components/ui/FilterSlider"
import { Switch } from "@/components/ui/Switch"
import { MAX_DISTANCE_MILES } from "@/constants"
import { milesToKm } from "@/lib/utils/locale"
import { colors, fontSize, fontFamily, spacing } from "@/theme"
import type { FitnessDiscipline } from "@/types/onboarding"
import React from "react"
import { StyleSheet, Text, View } from "react-native"

export interface DiscoveryFilterValues {
  ageRange: [number, number] | null
  distance: number | null
  workoutTypes: FitnessDiscipline[]
}

export interface DiscoveryFilterDropdownsProps {
  distance: number | null
  ageRange: [number, number] | null
  workoutTypes: FitnessDiscipline[]
  onFiltersChange: (filters: DiscoveryFilterValues) => void
  onOpenDistanceSlider?: () => void
  onOpenAgeRangeSlider?: () => void
  /** Gym Crush Mode: same home gym only; distance pill shows label instead of slider */
  gymCrushModeEnabled?: boolean
  onGymCrushModeChange?: (open: boolean) => void
  distanceMinKm?: number
  distanceMaxKm?: number
}

const DEFAULT_DISTANCE_MIN_KM = 0
const DEFAULT_DISTANCE_MAX_KM = Math.round(milesToKm(MAX_DISTANCE_MILES))

export function DiscoveryFilterDropdowns({
  distance,
  ageRange,
  workoutTypes,
  onFiltersChange,
  onOpenDistanceSlider,
  onOpenAgeRangeSlider,
  gymCrushModeEnabled = false,
  onGymCrushModeChange,
  distanceMinKm = DEFAULT_DISTANCE_MIN_KM,
  distanceMaxKm = DEFAULT_DISTANCE_MAX_KM,
}: DiscoveryFilterDropdownsProps) {
  const handleAgeRangeChange = (value: [number, number] | null) => {
    onFiltersChange({
      ageRange: value,
      distance,
      workoutTypes,
    })
  }

  const handleDistanceChange = (value: number | null) => {
    onFiltersChange({
      ageRange,
      distance: value,
      workoutTypes,
    })
  }

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

      {/* Distance Filter — replaced by Gym Crush Mode label when enabled */}
      <View style={styles.filterItem}>
        {gymCrushModeEnabled ? (
          <View style={styles.gymCrushModeLabelWrap}>
            <Text style={styles.gymCrushModeLabel}>Gym Crush Mode</Text>
          </View>
        ) : (
          <FilterSlider
            value={distance}
            onValueChange={handleDistanceChange}
            min={distanceMinKm}
            max={distanceMaxKm}
            unit="km"
            label="Distance"
            onOpen={onOpenDistanceSlider}
          />
        )}
      </View>

      <View style={styles.filterItem}>
        <View style={styles.offerWallRow}>
          <Switch
            value={gymCrushModeEnabled}
            onValueChange={(value) => onGymCrushModeChange?.(value)}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    flex: 1,
  },
  filterItem: {
    flex: 1,
  },
  offerWallRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  gymCrushModeLabelWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  gymCrushModeLabel: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeSemibold,
    textAlign: "center",
  },
})
