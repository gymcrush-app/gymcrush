import { EmptyFeed } from '@/components/discover/EmptyFeed'
import { HeartbeatHeart } from '@/components/ui/HeartbeatHeart'
import { EmptyState } from '@/components/ui/EmptyState'
import { colors, fontSize, spacing } from '@/theme'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PlaygroundEmptyStatesScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.hint}>Preview all empty-state visuals in one place.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover</Text>
          <View style={styles.previewCard}>
            <EmptyFeed />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gym Gems</Text>
          <View style={styles.previewCard}>
            <EmptyState
              icon={<HeartbeatHeart size={120} />}
              iconVariant="image"
              title="Find your Gym Crush"
              description="Swipe on Discover to find the most liked and messaged people near you."
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crushes</Text>
          <View style={styles.previewCard}>
            <EmptyState
              icon={
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={40}
                  color={colors.mutedForeground}
                />
              }
              title="No messages yet"
              description="Start swiping to find your gym crush!"
              iconSize="sm"
            />
          </View>
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
    gap: spacing[6],
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  previewCard: {
    minHeight: 330,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
})
