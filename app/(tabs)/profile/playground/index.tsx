import { Button } from '@/components/ui/Button'
import { colors, fontSize, spacing } from '@/theme'
import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PlaygroundIndexScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.hint}>Choose a demo to try</Text>

        <Button
          variant="outline"
          size="lg"
          style={styles.entryButton}
          onPress={() => router.push('/(tabs)/profile/playground/haptics')}
        >
          Haptic feedback
        </Button>
        <Text style={styles.entryHint}>Six buttons from click to strongest</Text>

        <Button
          variant="outline"
          size="lg"
          style={styles.entryButton}
          onPress={() => router.push('/(tabs)/profile/playground/swiper')}
        >
          Discover swiper (2 cards)
        </Button>
        <Text style={styles.entryHint}>Swipe up / down to test transitions</Text>

        <Button
          variant="outline"
          size="lg"
          style={styles.entryButton}
          onPress={() => router.push('/(tabs)/profile/playground/modals')}
        >
          Modal demos
        </Button>
        <Text style={styles.entryHint}>Open Offer Wall and Match modal previews</Text>

        <Button
          variant="outline"
          size="lg"
          style={styles.entryButton}
          onPress={() => router.push('/(tabs)/profile/playground/empty-states')}
        >
          Empty states
        </Button>
        <Text style={styles.entryHint}>Preview Discover, Gym Gems, and Crushes empty states</Text>

        <Button
          variant="outline"
          size="lg"
          style={styles.entryButton}
          onPress={() => router.push('/(tabs)/profile/playground/active-toasts')}
        >
          Active toasts
        </Button>
        <Text style={styles.entryHint}>JS registry of toasts shown via lib/toast</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[6],
  },
  entryButton: {
    width: '100%',
    marginTop: spacing[2],
  },
  entryHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[4],
    marginLeft: spacing[1],
  },
})
