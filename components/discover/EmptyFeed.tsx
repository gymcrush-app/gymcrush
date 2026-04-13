import { HeartbeatHeart } from '@/components/ui/HeartbeatHeart';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react-native';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface EmptyFeedProps {
  message?: string;
  ctaLabel?: string;
  ctaIcon?: ReactNode;
  onCtaPress?: () => void;
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
  ctaLabel,
  ctaIcon,
  onCtaPress,
  onStartOver,
}: EmptyFeedProps) {
  const actionLabel = ctaLabel ?? (onStartOver ? 'Start Over' : undefined);
  const actionIcon = ctaIcon ?? (onStartOver ? <RotateCcw size={16} color={colors.primaryForeground} /> : undefined);
  const actionPress = onCtaPress ?? onStartOver;

  return (
    <EmptyState
      icon={<HeartbeatHeart size={120} />}
      iconVariant="image"
      title={message}
      description="Your next crush is out there. Check back soon for more lifters training near you."
      action={
        actionLabel && actionPress ? (
          <Button onPress={actionPress} variant="primary" size="lg">
            <View style={styles.buttonContent}>
              {actionIcon}
              <Text variant="body" weight="semibold" style={{ color: colors.primaryForeground }}>
                {actionLabel}
              </Text>
            </View>
          </Button>
        ) : undefined
      }
    />
  );
}
