import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface SwipeIndicatorProps {
  direction: 'up' | 'down';
  text: string;
  containerStyle?: 'default' | 'up';
}

export const SwipeIndicator = React.memo<SwipeIndicatorProps>(({ 
  direction, 
  text, 
  containerStyle = 'default'
}) => {
  const ChevronIcon = direction === 'up' ? ChevronUp : ChevronDown;
  const iconSize = direction === 'up' ? 20 : 16;
  const textVariant = direction === 'up' ? 'mutedSmall' : 'mutedXSmall';
  
  const displayText = text;

  return (
    <View style={containerStyle === 'up' ? styles.swipeUpContainer : styles.swipeDownContainer}>
      <View style={styles.swipeIndicatorRow}>
        {direction === 'up' && (
          <ChevronIcon size={iconSize} color={colors.mutedForeground} />
        )}
        <Text variant={textVariant}>{displayText}</Text>
        {direction === 'down' && (
          <ChevronIcon size={iconSize} color={colors.mutedForeground} />
        )}
      </View>
    </View>
  );
});

SwipeIndicator.displayName = 'SwipeIndicator';

const styles = StyleSheet.create({
  swipeDownContainer: {
    alignItems: 'center',
    backgroundColor: colors.muted,
    padding: spacing[1],
  },
  swipeUpContainer: {
    alignItems: 'center',
    marginTop: spacing[8],
    marginBottom: spacing[4],
  },
  swipeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
});
