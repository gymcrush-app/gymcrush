import React, { memo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Avatar } from "@/components/ui/Avatar"
import { UnreadDot } from "@/components/ui/UnreadDot"
import type { Conversation } from "@/lib/api/messages"
import { formatRelativeTime, truncateText } from "@/lib/utils/formatting"
import { colors, fontSize, fontWeight, spacing } from "@/theme"

export interface ConversationRowProps {
  item: Conversation
  currentUserId: string | undefined
  onPress: (matchId: string) => void
}

function ConversationRowInner({
  item,
  currentUserId,
  onPress,
}: ConversationRowProps) {
  const lastMessagePreview = item.lastMessage
    ? truncateText(item.lastMessage.content, 50)
    : "Start a conversation"
  const timestamp = item.lastMessage
    ? formatRelativeTime(item.lastMessage.created_at || "")
    : ""
  const isFromCurrentUser = item.lastMessage?.sender_id === currentUserId

  return (
    <Pressable
      style={({ pressed }) => [
        styles.conversationItem,
        pressed && styles.conversationItemPressed,
      ]}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          uri={item.otherUser.photo_urls[0] || null}
          size="md"
          name={item.otherUser.display_name}
        />
        <UnreadDot visible={item.unreadCount > 0} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.name, item.unreadCount > 0 && styles.nameUnread]}
          >
            {item.otherUser.display_name}
          </Text>
          {timestamp ? (
            <Text style={styles.timestamp}>{timestamp}</Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.preview,
            item.unreadCount > 0 && styles.previewUnread,
          ]}
          numberOfLines={1}
        >
          {isFromCurrentUser && item.lastMessage ? "You: " : ""}
          {lastMessagePreview}
        </Text>
      </View>
    </Pressable>
  )
}

export const ConversationRow = memo(ConversationRowInner)

const styles = StyleSheet.create({
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  conversationItemPressed: {
    backgroundColor: colors.muted,
    opacity: 0.8,
  },
  avatarContainer: {
    position: "relative",
  },
  contentContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[0.5],
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    flex: 1,
  },
  nameUnread: {
    fontWeight: fontWeight.semibold,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginLeft: spacing[2],
  },
  preview: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  previewUnread: {
    color: colors.foreground,
    fontWeight: fontWeight.medium,
  },
})
