import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { FilteredTextarea } from '@/components/ui/FilteredTextarea';
import { useFilteredInput } from '@/hooks/useFilteredInput';
import { colors, fontSize, spacing } from '@/theme';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

interface SelectedPrompt {
  title: string;
  answer: string;
}

interface MessageBottomSheetProps {
  bottomSheetRef: RefObject<BottomSheetModal | null>;
  selectedPrompt: SelectedPrompt | null;
  isImageChat: boolean;
  messageText: string;
  profileName: string;
  snapPoints: string[];
  bottomSheetIndex: number;
  onMessageTextChange: (text: string) => void;
  onClose: () => void;
  /** Called with the filtered (censored) message content when user taps Send. */
  onSend: (filteredContent: string) => void;
  onChange: (index: number) => void;
  /** Override the default header text. */
  headerText?: string;
  /** Override the send button label. */
  sendLabel?: string;
}

const renderBackdrop = (props: any) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.5}
  />
);

export function MessageBottomSheet({
  bottomSheetRef,
  selectedPrompt,
  isImageChat,
  messageText,
  profileName,
  snapPoints,
  bottomSheetIndex,
  onMessageTextChange,
  onClose,
  onSend,
  onChange,
  headerText,
  sendLabel,
}: MessageBottomSheetProps) {
  const filtered = useFilteredInput({ value: messageText, onChangeText: onMessageTextChange });

  const handleSend = () => {
    const content = filtered.getFilteredValue().trim();
    if (content) onSend(content);
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
      enablePanDownToClose
      android_keyboardInputMode="adjustResize"
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={onChange}
    >
      <BottomSheetScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {(selectedPrompt || isImageChat) && (
            <>
              {/* Header */}
              <Text variant="h3" style={styles.title}>
                {headerText ?? `Send ${profileName} a message`}
              </Text>

              {/* Prompt Section - Only show if it's a prompt-based chat */}
              {selectedPrompt && (
                <View style={styles.promptSection}>
                  <Text variant="mutedXSmall" weight="semibold" style={styles.promptTitle}>
                    {selectedPrompt.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.promptAnswer}>
                    {selectedPrompt.answer}
                  </Text>
                </View>
              )}

              {/* Message Input */}
              <FilteredTextarea
                placeholder={selectedPrompt ? "Write a message about their answer" : "Write a message"}
                value={filtered.value}
                onChangeText={filtered.onChangeText}
                style={styles.textarea}
                multiline
              />

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <Button
                  variant="outline"
                  size="md"
                  onPress={onClose}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onPress={handleSend}
                  disabled={!filtered.value.trim()}
                  style={styles.sendButton}
                >
                  {sendLabel ?? "Send"}
                </Button>
              </View>
            </>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.card,
  },
  indicator: {
    backgroundColor: colors.muted,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  title: {
    marginBottom: spacing[1],
  },
  promptSection: {
    marginBottom: spacing[1],
  },
  promptTitle: {
    fontSize: 8,
    marginBottom: spacing[1],
  },
  promptAnswer: {
    lineHeight: fontSize.sm * 1.4,
  },
  textarea: {
    marginBottom: spacing[1],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  cancelButton: {
    flex: 1,
  },
  sendButton: {
    flex: 1,
  },
});
