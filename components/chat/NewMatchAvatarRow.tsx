import React, { memo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Avatar } from "@/components/ui/Avatar"
import { UnreadDot } from "@/components/ui/UnreadDot"
import type { ConversationMatch } from "@/lib/api/messages"
import { colors, fontSize, fontWeight, spacing } from "@/theme"

export interface NewMatchAvatarRowProps {
  item: ConversationMatch
  onPress: (matchId: string) => void
}

function NewMatchAvatarRowInner({ item, onPress }: NewMatchAvatarRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.avatarItem,
        pressed && styles.avatarItemPressed,
      ]}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          uri={item.otherUser.photo_urls[0] || null}
          size="lg"
          name={item.otherUser.display_name}
        />
        <UnreadDot visible={item.isNewMatch === true} />
      </View>
      <Text style={styles.newMatchName} numberOfLines={1}>
        {item.otherUser.display_name}
      </Text>
    </Pressable>
  )
}

export const NewMatchAvatarRow = memo(NewMatchAvatarRowInner)

const styles = StyleSheet.create({
  avatarItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarItemPressed: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: "relative",
  },
  newMatchName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    marginTop: spacing[2],
    maxWidth: 80,
    textAlign: "center",
  },
})
