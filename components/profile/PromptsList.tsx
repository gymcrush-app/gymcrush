import { spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PromptItem } from './PromptItem';

interface Prompt {
  title: string;
  answer: string;
}

interface PromptsListProps {
  prompts: Prompt[];
  onPromptPress: (title: string, answer: string) => void;
}

export const PromptsList = React.memo<PromptsListProps>(({ prompts, onPromptPress }) => {
  return (
    <View style={styles.container}>
      {prompts.map((prompt) => (
        <PromptItem
          key={prompt.title}
          title={prompt.title}
          answer={prompt.answer}
          onPress={() => onPromptPress(prompt.title, prompt.answer)}
        />
      ))}
    </View>
  );
});

PromptsList.displayName = 'PromptsList';

const styles = StyleSheet.create({
  container: {
    gap: spacing[6],
  },
});
