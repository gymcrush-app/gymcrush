import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Compass, RotateCcw } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { colors, spacing, borderRadius } from '@/theme';

interface EmptyFeedProps {
  message?: string;
  onStartOver?: () => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  title: {
    marginBottom: spacing[2],
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
});

export function EmptyFeed({ message = "No one to discover right now", onStartOver }: EmptyFeedProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Compass size={48} color={colors.mutedForeground} />
      </View>
      <Text variant="h2" style={styles.title}>{message}</Text>
      <Text variant="muted" style={styles.description}>
        Check back later for new people training near you.
      </Text>
      {onStartOver && (
        <Button onPress={onStartOver} variant="primary" size="lg">
          <View style={styles.buttonContent}>
            <RotateCcw size={16} color={colors.primaryForeground} />
            <Text variant="body" weight="semibold" style={{ color: colors.primaryForeground }}>
              Start Over
            </Text>
          </View>
        </Button>
      )}
    </View>
  );
}
