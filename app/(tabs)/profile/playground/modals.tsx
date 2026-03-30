import { MatchModal } from '@/components/discover/MatchModal'
import { OfferWallModal } from '@/components/discover/OfferWallModal'
import { Button } from '@/components/ui/Button'
import { colors, fontSize, spacing } from '@/theme'
import type { Profile } from '@/types'
import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const NOW_ISO = new Date().toISOString()

const MOCK_CURRENT_USER: Profile = {
  id: 'playground-current-user',
  display_name: 'You',
  age: 26,
  approach_prompt: null,
  bio: null,
  created_at: NOW_ISO,
  discovery_preferences: {} as any,
  fitness_disciplines: [],
  gender: 'female',
  gems_received_count: 0,
  height: null,
  home_gym_id: null,
  is_onboarded: true,
  is_visible: true,
  last_gem_given_at: null,
  last_location: null,
  last_location_updated_at: null,
  occupation: null,
  photo_urls: ['https://picsum.photos/seed/playground-current-user/900/900'],
  updated_at: null,
}

const MOCK_MATCHED_USER: Profile = {
  id: 'playground-match-user',
  display_name: 'Riley',
  age: 28,
  approach_prompt: 'Always down for a lift and a coffee.',
  bio: 'Powerbuilding and weekend hikes.',
  created_at: NOW_ISO,
  discovery_preferences: {} as any,
  fitness_disciplines: [],
  gender: 'male',
  gems_received_count: 0,
  height: '178',
  home_gym_id: null,
  is_onboarded: true,
  is_visible: true,
  last_gem_given_at: null,
  last_location: null,
  last_location_updated_at: null,
  occupation: 'Coach',
  photo_urls: ['https://picsum.photos/seed/playground-match-user/900/900'],
  updated_at: null,
}

export default function PlaygroundModalsScreen() {
  const [showOfferWall, setShowOfferWall] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)

  const matchedUser = useMemo(() => MOCK_MATCHED_USER, [])

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.hint}>Open each modal directly to review visuals and interactions.</Text>

        <View style={styles.actions}>
          <Button
            variant="outline"
            size="lg"
            style={styles.button}
            onPress={() => setShowOfferWall(true)}
          >
            Show Offer Wall modal
          </Button>
          <Button
            variant="outline"
            size="lg"
            style={styles.button}
            onPress={() => setShowMatchModal(true)}
          >
            Show Match modal
          </Button>
        </View>
      </ScrollView>

      <OfferWallModal
        visible={showOfferWall}
        onClose={() => setShowOfferWall(false)}
        onCtaPress={() => setShowOfferWall(false)}
      />

      <MatchModal
        visible={showMatchModal}
        currentUser={MOCK_CURRENT_USER}
        matchedUser={matchedUser}
        onStartChatting={() => setShowMatchModal(false)}
        onKeepSwiping={() => setShowMatchModal(false)}
      />
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
  actions: {
    gap: spacing[3],
  },
  button: {
    width: '100%',
  },
})
