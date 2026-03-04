import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import { MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface PromptItemProps {
  title: string;
  answer: string;
  onPress: () => void;
}

export const PromptItem = React.memo<PromptItemProps>(({ title, answer, onPress }) => {
  return (
    <View>
      <View style={styles.header}>
        <Text variant="label" weight="semibold">
          {title}
        </Text>
        <Pressable onPress={onPress}>
          <MessageCircle size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <Text variant="body">
        {answer}
      </Text>
    </View>
  );
});

PromptItem.displayName = 'PromptItem';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
});
