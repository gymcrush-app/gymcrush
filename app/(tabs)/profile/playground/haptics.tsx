import { Button } from '@/components/ui/Button'
import { colors, fontSize, fontWeight, spacing } from '@/theme'
import * as Haptics from 'expo-haptics'
import React, { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const HAPTIC_STEPS = [
  {
    key: 'selection',
    label: 'Selection (click)',
    run: async () => {
      await Haptics.selectionAsync()
    },
  },
  {
    key: 'impact_light',
    label: 'Impact: Light',
    run: async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
  },
  {
    key: 'impact_medium',
    label: 'Impact: Medium',
    run: async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
  },
  {
    key: 'impact_heavy',
    label: 'Impact: Heavy',
    run: async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    },
  },
  {
    key: 'impact_rigid',
    label: 'Impact: Rigid',
    run: async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
    },
  },
  {
    key: 'notification_error',
    label: 'Notification: Error (strongest)',
    run: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  },
] as const

export default function PlaygroundHapticsScreen() {
  const [isHapticsRunning, setIsHapticsRunning] = useState(false)

  const triggerHaptic = useCallback(
    async (run: () => Promise<void>) => {
      if (isHapticsRunning) return
      setIsHapticsRunning(true)
      try {
        await run()
      } catch (err) {
        console.warn('Haptics demo failed:', err)
      } finally {
        setIsHapticsRunning(false)
      }
    },
    [isHapticsRunning],
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.hint}>Tap from click to strongest.</Text>

        <View style={styles.hapticsList}>
          {HAPTIC_STEPS.map((step) => (
            <Button
              key={step.key}
              variant="outline"
              size="md"
              disabled={isHapticsRunning}
              onPress={() => triggerHaptic(step.run)}
              style={styles.hapticsButton}
            >
              {step.label}
            </Button>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[4],
  },
  hapticsList: {
    gap: spacing[3],
  },
  hapticsButton: {
    width: '100%',
  },
})
