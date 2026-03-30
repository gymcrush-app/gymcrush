import { HeartbeatHeart } from '@/components/ui/HeartbeatHeart';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { RotateCcw } from 'lucide-react-native';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface EmptyFeedProps {
  message?: string;
  onStartOver?: () => void;
}

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
});

export function EmptyFeed({
  message = 'No one to discover right now',
  onStartOver,
}: EmptyFeedProps) {
  return (
    <EmptyState
      icon={<HeartbeatHeart size={120} />}
      iconVariant="image"
      title={message}
      description="Your next crush is out there. Check back soon for more lifters training near you."
      action={
        onStartOver ? (
          <Button onPress={onStartOver} variant="primary" size="lg">
            <View style={styles.buttonContent}>
              <RotateCcw size={16} color={colors.primaryForeground} />
              <Text variant="body" weight="semibold" style={{ color: colors.primaryForeground }}>
                Start Over
              </Text>
            </View>
          </Button>
        ) : undefined
      }
    />
  );
}
