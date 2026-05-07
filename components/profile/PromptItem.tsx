import { Text } from "@/components/ui/Text"
import { borderRadius, colors, fontFamily, spacing } from "@/theme"
import { MessageCircle } from "lucide-react-native"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"

interface PromptItemProps {
  title: string
  answer: string
  onPress: () => void
  /** Render with primary background card style */
  highlighted?: boolean
  /** Show the chat-bubble button. Default true. Hide for self-profile. */
  showMessageButton?: boolean
}

export const PromptItem = React.memo<PromptItemProps>(
  ({ title, answer, onPress, highlighted, showMessageButton = true }) => {
    return (
      <View style={highlighted ? styles.highlightedCard : undefined}>
        <View style={styles.header}>
          <Text variant="mutedXSmall" style={styles.promptTitle}>
            {title}
          </Text>
          {showMessageButton && (
            <Pressable onPress={onPress} style={styles.messageButton}>
              <MessageCircle
                size={16}
                color={highlighted ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>
        <Text variant="bodyLarge" style={styles.answer}>
          {answer}
        </Text>
      </View>
    )
  },
)

PromptItem.displayName = "PromptItem"

const styles = StyleSheet.create({
  header: {
    position: "relative",
    marginBottom: spacing[2],
  },
  promptTitle: {
    fontSize: 12,
    paddingRight: spacing[7],
    fontFamily: fontFamily.manropeSemibold,
  },
  answer: {
    fontFamily: fontFamily.manropeExtrabold,
  },
  messageButton: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -8 }],
  },
  highlightedCard: {
    backgroundColor: "#262628",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    paddingTop: spacing[1],
  },
})
