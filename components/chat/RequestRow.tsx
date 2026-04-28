import React, { memo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Avatar } from "@/components/ui/Avatar"
import { UnreadDot } from "@/components/ui/UnreadDot"
import type { MessageRequest } from "@/lib/api/messages"
import { formatRelativeTime, truncateText } from "@/lib/utils/formatting"
import { colors, fontSize, fontFamily, spacing } from "@/theme"

export interface RequestRowProps {
  item: MessageRequest
  onPress: (senderId: string) => void
}

function RequestRowInner({ item, onPress }: RequestRowProps) {
  const lastMessagePreview = truncateText(item.lastMessage.content, 50)
  const timestamp = formatRelativeTime(item.lastMessage.created_at || "")

  return (
    <Pressable
      style={({ pressed }) => [
        styles.conversationItem,
        pressed && styles.conversationItemPressed,
      ]}
      onPress={() => onPress(item.sender.id)}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          uri={item.sender.photo_urls?.[0] || null}
          size="md"
          name={item.sender.display_name}
        />
        <UnreadDot visible={item.unreadCount > 0} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.name, item.unreadCount > 0 && styles.nameUnread]}
          >
            {item.sender.display_name}
          </Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
        <Text
          style={[
            styles.preview,
            item.unreadCount > 0 && styles.previewUnread,
          ]}
          numberOfLines={1}
        >
          {lastMessagePreview}
        </Text>
      </View>
    </Pressable>
  )
}

export const RequestRow = memo(RequestRowInner)

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
    fontFamily: fontFamily.manropeMedium,
    color: colors.foreground,
    flex: 1,
  },
  nameUnread: {
    fontFamily: fontFamily.manropeSemibold,
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
    fontFamily: fontFamily.manropeMedium,
  },
})
