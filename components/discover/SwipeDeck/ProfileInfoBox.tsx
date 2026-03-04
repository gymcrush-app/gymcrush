import { Text } from '@/components/ui/Text';
import { borderRadius, colors, spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProfileInfoBoxProps {
  intents: string;
  disciplines: string;
  distance: string | null;
}

export const ProfileInfoBox = React.memo<ProfileInfoBoxProps>(({ 
  intents, 
  disciplines, 
  distance 
}) => {
  return (
    <View style={styles.infoBox}>
      <View style={styles.infoBoxRow}>
        <View style={styles.infoBoxItem}>
          <Text variant="mutedXSmall" style={{ marginBottom: spacing[1] }}>INTENT</Text>
          <Text variant="bodySmall" weight="semibold">
            {intents}
          </Text>
        </View>
        <View style={styles.infoBoxItem}>
          <Text variant="mutedXSmall" style={{ marginBottom: spacing[1] }}>FOCUS</Text>
          <Text variant="bodySmall" weight="semibold">
            {disciplines}
          </Text>
        </View>
        <View style={styles.infoBoxItem}>
          <Text variant="mutedXSmall" style={{ marginBottom: spacing[1] }}>HEIGHT</Text>
          <Text variant="bodySmall" weight="semibold">—</Text>
        </View>
        <View style={styles.infoBoxItem}>
          <Text variant="mutedXSmall" style={{ marginBottom: spacing[1] }}>DISTANCE</Text>
          <Text variant="bodySmall" weight="semibold">
            {distance}
          </Text>
        </View>
      </View>
    </View>
  );
});

ProfileInfoBox.displayName = 'ProfileInfoBox';

const styles = StyleSheet.create({
  infoBox: {
    backgroundColor: `${colors.card}E6`, // 90% opacity
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  infoBoxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  infoBoxItem: {
    flex: 1,
    minWidth: 140,
  },
});
