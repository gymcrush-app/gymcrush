import { Text } from '@/components/ui/Text';
import { borderRadius, colors, fontFamily, spacing } from '@/theme';
import { MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const PROMPT_TITLE_FONT_SIZE = 10;

interface PromptItemProps {
  title: string;
  answer: string;
  onPress: () => void;
  /** Render with primary background card style */
  highlighted?: boolean;
}

export const PromptItem = React.memo<PromptItemProps>(({ title, answer, onPress, highlighted }) => {
  return (
    <View style={highlighted ? styles.highlightedCard : undefined}>
      <View style={styles.header}>
        <Text
          variant="mutedXSmall"
          style={styles.promptTitle}
        >
          {title}
        </Text>
        <Pressable onPress={onPress} style={styles.messageButton}>
          <MessageCircle size={16} color={highlighted ? colors.primary : colors.mutedForeground} />
        </Pressable>
      </View>
      <Text variant="body" style={styles.answer}>
        {answer}
      </Text>
    </View>
  );
});

PromptItem.displayName = 'PromptItem';

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    marginBottom: spacing[2],
  },
  promptTitle: {
    fontSize: PROMPT_TITLE_FONT_SIZE,
    paddingRight: spacing[7],
    fontFamily: fontFamily.manropeSemibold,
  },
  answer: {
    fontFamily: fontFamily.manropeExtrabold,
  },
  messageButton: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  highlightedCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
});
