import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme';

type PermissionPromptProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  onRequestPermission: () => Promise<void> | void;
  showOpenSettings?: boolean;
};

export function PermissionPrompt({
  title = 'Turn on notifications',
  description = 'Get alerts for new GymCrushes and messages.',
  ctaLabel = 'Enable notifications',
  onRequestPermission,
  showOpenSettings = true,
}: PermissionPromptProps) {
  return (
    <Card>
      <View style={styles.content}>
        <Text variant="h3" weight="bold">
          {title}
        </Text>
        <Text variant="muted">{description}</Text>

        <View style={styles.actions}>
          <Button onPress={onRequestPermission}>{ctaLabel}</Button>
          {showOpenSettings ? (
            <Button variant="ghost" onPress={() => Linking.openSettings()}>
              Open settings
            </Button>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[3],
  },
  actions: {
    marginTop: spacing[2],
    gap: spacing[2],
  },
});

