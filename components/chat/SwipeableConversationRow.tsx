import { ConversationRow } from "@/components/chat/ConversationRow"
import type { Conversation, ConversationMatch } from "@/lib/api/messages"
import { colors, fontSize, fontWeight, spacing } from "@/theme"
import React, { useCallback, useRef } from "react"
import { Alert, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import SwipeableItem, { useUnderlayParams } from "react-native-swipeable-item"

const UNMATCH_SNAP_LEFT = 100
// activationThreshold (default 20): horizontal px before swipe engages. Increase if FlashList vertical scroll is captured.

export interface SwipeableConversationRowProps {
  item: Conversation
  currentUserId: string | undefined
  onPress: (item: Conversation) => void
  onUnmatch: (matchId: string) => void
}

function UnmatchUnderlayContent({ onUnmatch }: { onUnmatch: (matchId: string) => void }) {
  const { item, close } = useUnderlayParams<ConversationMatch>()

  const handlePress = useCallback(() => {
    Alert.alert(
      "Unmatch",
      `Unmatch with ${item.otherUser.display_name}? You will lose your conversation.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => close() },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: () => {
            close()
            onUnmatch(item.id)
          },
        },
      ]
    )
  }, [item, close, onUnmatch])

  return (
    <View style={underlayStyles.underlay}>
      <TouchableOpacity
        style={underlayStyles.button}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={underlayStyles.buttonText}>Unmatch</Text>
      </TouchableOpacity>
    </View>
  )
}

const underlayStyles = StyleSheet.create({
  underlay: {
    flex: 1,
    backgroundColor: colors.destructive,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: spacing[4],
  },
  button: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
})

export function SwipeableConversationRow({
  item,
  currentUserId,
  onPress,
  onUnmatch,
}: SwipeableConversationRowProps) {
  const swipeableRef = useRef<any>(null)
  const isGemInbox = item.kind === "gem_inbox"

  const renderUnderlayLeft = useCallback(
    () => <UnmatchUnderlayContent onUnmatch={onUnmatch} />,
    [onUnmatch],
  )

  const handlePressSwipeable = useCallback(() => {
    swipeableRef.current?.close()
    onPress(item)
  }, [item, onPress])

  if (isGemInbox) {
    return (
      <Pressable onPress={() => onPress(item)} style={rowWrapperStyle}>
        <ConversationRow item={item} currentUserId={currentUserId} />
      </Pressable>
    )
  }

  return (
    <SwipeableItem
      ref={swipeableRef}
      item={item}
      renderUnderlayLeft={renderUnderlayLeft}
      snapPointsLeft={[UNMATCH_SNAP_LEFT]}
      activationThreshold={20}
      swipeDamping={10}
    >
      <Pressable onPress={handlePressSwipeable} style={rowWrapperStyle}>
        <ConversationRow item={item} currentUserId={currentUserId} />
      </Pressable>
    </SwipeableItem>
  )
}

const rowWrapperStyle = { flex: 1 }
