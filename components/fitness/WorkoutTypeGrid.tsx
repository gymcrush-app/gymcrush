import { getFitnessIcon } from "@/components/icons/FitnessIcons"
import { WORKOUT_TYPE_OPTIONS, type WorkoutTypeOption } from "@/constants"
import { borderRadius, colors, fontSize, fontFamily, spacing } from "@/theme"
import type { FitnessDiscipline } from "@/types/onboarding"
import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

export type { WorkoutTypeOption } from "@/constants"

type WorkoutTypeGridVariant = "onboarding" | "bottomSheet"

interface WorkoutTypeGridProps {
  selected: FitnessDiscipline[]
  onToggle: (value: FitnessDiscipline) => void
  options?: WorkoutTypeOption[]
  variant?: WorkoutTypeGridVariant
}

export function WorkoutTypeGrid({
  selected,
  onToggle,
  options = WORKOUT_TYPE_OPTIONS,
  variant = "onboarding",
}: WorkoutTypeGridProps) {
  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value)
        const IconComponent = getFitnessIcon(option.value)

        return (
          <Pressable
            key={option.value}
            onPress={() => onToggle(option.value)}
            style={[
              styles.cardBase,
              variant === "onboarding"
                ? styles.cardOnboarding
                : styles.cardBottomSheet,
              isSelected && styles.cardSelected,
              {
                shadowColor: isSelected ? colors.primary : colors.background,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: isSelected ? 3 : 1,
                transform: [{ scale: isSelected ? 1.02 : 1 }],
              },
            ]}
          >
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <IconComponent
                  size={fontSize["3xl"]}
                  color={isSelected ? colors.primary : colors.foreground}
                />
              </View>
              <Text style={styles.label}>{option.label}</Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  cardBase: {
    width: "30%",
    height: 200,
    aspectRatio: 1,
    borderRadius: borderRadius["2xl"],
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardOnboarding: {
    height: 100,
    justifyContent: "center",
  },
  cardBottomSheet: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
  },
  cardContent: {
    alignItems: "center",
    // justifyContent: 'center',
    gap: spacing[2],
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.manropeMedium,
    textAlign: "center",
    paddingHorizontal: spacing[1],
    color: colors.foreground,
  },
})
