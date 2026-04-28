import { Button } from '@/components/ui/Button'
import {
  getActiveToasts,
  subscribeActiveToasts,
  toast,
  type ActiveToast,
} from '@/lib/toast'
import { colors, fontSize, fontFamily, spacing } from '@/theme'
import React, { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

function formatRemaining(entry: ActiveToast): string {
  const elapsedMs = Date.now() - entry.startedAt
  const remainingSec = Math.max(
    0,
    entry.expectedDurationSec - elapsedMs / 1000,
  )
  return `~${remainingSec.toFixed(1)}s left`
}

export default function PlaygroundActiveToastsScreen() {
  const [active, setActive] = useState<ActiveToast[]>(() => getActiveToasts())

  useEffect(() => {
    return subscribeActiveToasts(() => {
      setActive(getActiveToasts())
    })
  }, [])

  useEffect(() => {
    if (active.length === 0) return
    const id = setInterval(() => {
      setActive(getActiveToasts())
    }, 500)
    return () => clearInterval(id)
  }, [active.length])

  const refresh = useCallback(() => {
    setActive(getActiveToasts())
  }, [])

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.disclaimer}>
          JS-side registry only. Drag-to-dismiss and other native behavior are
          not reflected here; rows disappear after the expected duration.
        </Text>

        <View style={styles.actions}>
          <Button
            variant="outline"
            size="md"
            onPress={() => toast({ preset: 'none', title: 'Short toast', duration: 2 })}
          >
            Toast 2s (none)
          </Button>
          <Button
            variant="outline"
            size="md"
            onPress={() =>
              toast({ preset: 'done', title: 'Default duration', message: '5s' })
            }
          >
            Toast default (5s)
          </Button>
          <Button
            variant="outline"
            size="md"
            onPress={() =>
              toast({
                preset: 'error',
                title: 'Error preset',
                duration: 4,
              })
            }
          >
            Error 4s
          </Button>
          <Button variant="ghost" size="sm" onPress={refresh}>
            Refresh list
          </Button>
        </View>

        <Text style={styles.sectionTitle}>Active ({active.length})</Text>
        {active.length === 0 ? (
          <Text style={styles.empty}>No tracked toasts right now.</Text>
        ) : (
          active.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {entry.title}
              </Text>
              {entry.message ? (
                <Text style={styles.rowMessage} numberOfLines={2}>
                  {entry.message}
                </Text>
              ) : null}
              <Text style={styles.rowMeta}>
                {formatRemaining(entry)} · {entry.expectedDurationSec}s expected ·{' '}
                {new Date(entry.startedAt).toLocaleTimeString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  disclaimer: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  actions: {
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  empty: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[2],
    backgroundColor: colors.card,
  },
  rowTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeMedium,
    color: colors.foreground,
  },
  rowMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  rowMeta: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[2],
  },
})
