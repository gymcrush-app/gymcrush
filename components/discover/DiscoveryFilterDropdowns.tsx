import { FilterRangeSlider } from "@/components/ui/FilterRangeSlider"
import { FilterSlider } from "@/components/ui/FilterSlider"
import { Switch } from "@/components/ui/Switch"
import { MAX_DISTANCE_MILES } from "@/constants"
import { milesToKm } from "@/lib/utils/locale"
import { spacing } from "@/theme"
import type { FitnessDiscipline } from "@/types/onboarding"
import React from "react"
import { StyleSheet, View } from "react-native"

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
  offerWallOpen?: boolean
  onOfferWallChange?: (open: boolean) => void
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
  offerWallOpen = false,
  onOfferWallChange,
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

      {/* Offer wall - switch opens placeholder bottom sheet */}
      <View style={styles.filterItem}>
        <View style={styles.offerWallRow}>
          <Switch
            value={offerWallOpen}
            onValueChange={(value) => onOfferWallChange?.(value)}
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
})
