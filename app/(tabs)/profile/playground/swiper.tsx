import { SwipeDeck } from '@/components/discover/SwipeDeck'
import { MatchModal } from '@/components/discover/MatchModal'
import { colors, fontSize, fontWeight, spacing, borderRadius } from '@/theme'
import type { Profile, SwipeAction } from '@/types'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const NOW_ISO = new Date().toISOString()

/** Fake "current user" profile for the match modal */
const MOCK_CURRENT_USER: Profile = {
  id: 'mock-current-user',
  display_name: 'You',
  age: 25,
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
  photo_urls: ['https://picsum.photos/seed/gymcrush-current-user/900/900'],
  updated_at: null,
}

const MOCK_PROFILES: Profile[] = [
  {
    id: 'mock-profile-1',
    display_name: 'Avery',
    age: 27,
    approach_prompt: "Open to being approached. Let's train.",
    bio: 'Cardio + lifting enjoyer. Here for the vibes and the PRs.',
    created_at: NOW_ISO,
    discovery_preferences: {
      intents: [],
      height: '170',
    } as any,
    fitness_disciplines: [],
    gender: 'male',
    gems_received_count: 0,
    height: '170',
    home_gym_id: null,
    is_onboarded: true,
    is_visible: true,
    last_gem_given_at: null,
    last_location: null,
    last_location_updated_at: null,
    occupation: 'Coach',
    photo_urls: [
      'https://picsum.photos/seed/gymcrush-profile-1a/900/900',
      'https://picsum.photos/seed/gymcrush-profile-1b/900/900',
    ],
    updated_at: null,
  },
  {
    id: 'mock-profile-2',
    display_name: 'Jordan',
    age: 29,
    approach_prompt: 'Approach me with your best workout recommendation.',
    bio: 'Strength focused, always learning. Ask me about programming.',
    created_at: NOW_ISO,
    discovery_preferences: {
      intents: [],
      height: '180',
    } as any,
    fitness_disciplines: [],
    gender: 'female',
    gems_received_count: 0,
    height: '180',
    home_gym_id: null,
    is_onboarded: true,
    is_visible: true,
    last_gem_given_at: null,
    last_location: null,
    last_location_updated_at: null,
    occupation: 'Trainer',
    photo_urls: [
      'https://picsum.photos/seed/gymcrush-profile-2a/900/900',
      'https://picsum.photos/seed/gymcrush-profile-2b/900/900',
    ],
    updated_at: null,
  },
]

export default function PlaygroundSwiperScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [profiles, setProfiles] = useState<Profile[]>(MOCK_PROFILES)

  const frontName = profiles[0]?.display_name ?? '—'
  const backName = profiles[1]?.display_name ?? '—'

  const [playgroundSwipeResult, setPlaygroundSwipeResult] = useState<"match" | "no-match" | null>(null)
  const [lastSwipedId, setLastSwipedId] = useState<string | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  /** Alternates: false = no-match, true = match */
  const nextIsMatchRef = useRef(false)

  const handleSwipe = useCallback((profileId: string, action: SwipeAction) => {
    if (action === "pass") {
      setProfiles((prev) => {
        const swiped = prev.find((p) => p.id === profileId)
        if (!swiped) return prev
        const remaining = prev.filter((p) => p.id !== profileId)
        return [...remaining, swiped]
      })
    } else {
      // Like — alternate between match and no-match
      const isMatch = nextIsMatchRef.current
      nextIsMatchRef.current = !nextIsMatchRef.current

      setLastSwipedId(profileId)

      if (isMatch) {
        const profile = profiles.find((p) => p.id === profileId) ?? null
        setMatchedProfile(profile)
      }

      // Signal result immediately (tiny delay for state to settle)
      setTimeout(() => {
        if (isMatch) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          setPlaygroundSwipeResult("match")
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          setPlaygroundSwipeResult("no-match")
        }
      }, 50)
    }
  }, [profiles])

  const cycleProfile = useCallback(() => {
    if (lastSwipedId) {
      setProfiles((prev) => {
        const swiped = prev.find((p) => p.id === lastSwipedId)
        if (!swiped) return prev
        const remaining = prev.filter((p) => p.id !== lastSwipedId)
        return [...remaining, swiped]
      })
    }
    setPlaygroundSwipeResult(null)
    setLastSwipedId(null)
  }, [lastSwipedId])

  const handleSwipeComplete = useCallback(() => {
    if (playgroundSwipeResult === "match") {
      // Celebration finished — now show the match modal
      setShowMatchModal(true)
      // Don't cycle yet — wait for modal dismissal
      return
    }
    // No-match — cycle immediately
    cycleProfile()
  }, [playgroundSwipeResult, cycleProfile])

  const handleKeepSwiping = useCallback(() => {
    setShowMatchModal(false)
    setMatchedProfile(null)
    cycleProfile()
  }, [cycleProfile])

  const handleStartChatting = useCallback(() => {
    // In playground, just dismiss and keep swiping
    setShowMatchModal(false)
    setMatchedProfile(null)
    cycleProfile()
  }, [cycleProfile])

  const deckHeight = useMemo(
    () => Math.round(SCREEN_HEIGHT * 0.75),
    [],
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + spacing[2] }]}
        hitSlop={8}
      >
        <ChevronLeft size={22} color={colors.foreground} />
      </Pressable>
      <View style={styles.header}>
        <Text style={styles.hint}>
          Front: {frontName} • Back: {backName} • Next like: {nextIsMatchRef.current ? 'MATCH' : 'no match'}
        </Text>
      </View>
      <View style={[styles.deckWrapper, { height: deckHeight }]}>
        <SwipeDeck
          profiles={profiles}
          onSwipe={handleSwipe}
          swipeResult={playgroundSwipeResult}
          onSwipeComplete={handleSwipeComplete}
          showPhotoSwipeTooltip={false}
          showImageCommentTooltip={false}
          showSwipeDownTooltip={false}
          showSwipeUpTooltip={false}
          onReportAndBlock={undefined}
        />
      </View>

      {/* Match Modal — appears after celebration completes */}
      {matchedProfile && (
        <MatchModal
          visible={showMatchModal}
          currentUser={MOCK_CURRENT_USER}
          matchedUser={matchedProfile}
          onStartChatting={handleStartChatting}
          onKeepSwiping={handleKeepSwiping}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    position: 'absolute',
    left: spacing[3],
    zIndex: 10,
    padding: spacing[2],
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  hint: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  deckWrapper: {
    flex: 1,
    width: '100%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
})
