import { WorkoutTypeGrid } from "@/components/fitness/WorkoutTypeGrid"
import { FloatingActionButton } from "@/components/onboarding/FloatingActionButton"
import { OnboardingContainer } from "@/components/onboarding/OnboardingContainer"
import { useOnboardingStore } from "@/lib/stores/onboardingStore"
import { colors, fontSize, fontWeight, spacing } from "@/theme"
import type { FitnessDiscipline } from "@/types/onboarding"
import { useNavigation } from "expo-router"
import React from "react"
import { StyleSheet, Text, View } from "react-native"

export default function OnboardingFitness() {
  const navigation = useNavigation()
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const toggleDiscipline = (discipline: FitnessDiscipline) => {
    const current = data.disciplines
    const updated = current.includes(discipline)
      ? current.filter((d) => d !== discipline)
      : [...current, discipline]
    updateData({ disciplines: updated })
  }

  const canContinue = data.disciplines.length > 0

  const handleNext = () => {
    if (canContinue) {
      ;(navigation as any).navigate("frequency")
    }
  }

  return (
    <OnboardingContainer currentStep={4} totalSteps={14} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>How do you like to train?</Text>
          <Text style={styles.subtitle}>Select all that apply to you</Text>
        </View>

        <View style={styles.content}>
          <WorkoutTypeGrid
            variant="onboarding"
            selected={data.disciplines}
            onToggle={toggleDiscipline}
          />
        </View>

        <FloatingActionButton onPress={handleNext} disabled={!canContinue}>
          Continue
        </FloatingActionButton>
      </View>
    </OnboardingContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: spacing[8],
    gap: spacing[2],
    alignItems: "center",
  },
  title: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: spacing[32],
  },
})
