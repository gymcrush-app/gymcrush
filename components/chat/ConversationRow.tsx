import React, { memo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { BlurView } from "expo-blur"
import { Gem } from "lucide-react-native"
import { Avatar } from "@/components/ui/Avatar"
import { UnreadDot } from "@/components/ui/UnreadDot"
import type { Conversation } from "@/lib/api/messages"
import { formatRelativeTime, truncateText } from "@/lib/utils/formatting"
import { borderRadius, colors, fontSize, fontFamily, spacing } from "@/theme"

const AVATAR_MD = 48

export interface ConversationRowProps {
  item: Conversation
  currentUserId: string | undefined
}

function ConversationRowInner({ item, currentUserId }: ConversationRowProps) {
  const isGemInbox = item.kind === "gem_inbox"
  const lastMessagePreview = item.lastMessage
    ? truncateText(item.lastMessage.content, 50)
    : "Start a conversation"
  const timestamp = item.lastMessage
    ? formatRelativeTime(item.lastMessage.created_at || "")
    : ""
  const isFromCurrentUser = item.lastMessage?.sender_id === currentUserId

  return (
    <View style={styles.conversationItem}>
      <View style={styles.avatarContainer}>
        <View
          style={[
            styles.avatarFrame,
            isGemInbox && styles.avatarFrameGem,
          ]}
        >
          <Avatar
            uri={item.otherUser.photo_urls[0] || null}
            size="md"
            name={item.otherUser.display_name}
          />
          {isGemInbox ? (
            <>
              <BlurView
                pointerEvents="none"
                intensity={55}
                tint="dark"
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.gemIconWrap} pointerEvents="none">
                <Gem size={26} color={colors.primary} strokeWidth={2.2} />
              </View>
            </>
          ) : null}
        </View>
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
    </View>
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
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarFrame: {
    width: AVATAR_MD,
    height: AVATAR_MD,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  avatarFrameGem: {
    // subtle ring so blur edge reads cleanly on dark rows
    borderWidth: 1,
    borderColor: colors.border,
  },
  gemIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
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
