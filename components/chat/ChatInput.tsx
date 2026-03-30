import { CensoredPreview } from '@/components/ui/CensoredPreview';
import { useFilteredInput } from '@/hooks/useFilteredInput';
import { borderRadius, colors, fontSize, spacing } from '@/theme';
import { Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_INPUT_HEIGHT = 100;
const MIN_INPUT_HEIGHT = 40;

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const messageInput = useFilteredInput('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

  const handleSend = () => {
    const trimmed = messageInput.getFilteredValue().trim();
    if (trimmed.length > 0 && !disabled) {
      onSend(trimmed);
      messageInput.setValue('');
      setInputHeight(MIN_INPUT_HEIGHT);
    }
  };

  const handleChangeText = (text: string) => {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      messageInput.onChangeText(text);
    }
  };

  const handleContentSizeChange = (event: any) => {
    const height = Math.min(
      Math.max(MIN_INPUT_HEIGHT, event.nativeEvent.contentSize.height + 16),
      MAX_INPUT_HEIGHT
    );
    setInputHeight(height);
  };

  const canSend = messageInput.value.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { height: inputHeight, maxHeight: MAX_INPUT_HEIGHT },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          value={messageInput.value}
          onChangeText={handleChangeText}
          onContentSizeChange={handleContentSizeChange}
          editable={!disabled}
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            pressed && canSend && styles.sendButtonPressed,
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Send
            size={20}
            color={canSend ? colors.primaryForeground : colors.mutedForeground}
          />
        </Pressable>
      </View>
      <CensoredPreview
        filtered={messageInput.filteredPreview}
        show={messageInput.hasBadWords}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing[4],
    // paddingBottom: spacing[4],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  input: {
    flex: 1,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    color: colors.foreground,
    fontSize: fontSize.base,
    minHeight: MIN_INPUT_HEIGHT,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.muted,
    opacity: 0.5,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
});
