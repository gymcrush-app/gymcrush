import { Text } from '@/components/ui/Text';
import { borderRadius, colors, spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProfileInfoBoxProps {
  height: string | null;
  intent: string;
  occupation: string | null;
  city: string | null;
}

export const ProfileInfoBox = React.memo<ProfileInfoBoxProps>(({
  height,
  intent,
  occupation,
  city,
}) => {
  return (
    <View style={styles.infoBox}>
      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>HEIGHT</Text>
          <Text variant="bodySmall" weight="semibold">{height ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>OCCUPATION</Text>
          <Text variant="bodySmall" weight="semibold">{occupation ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>INTENT</Text>
          <Text variant="bodySmall" weight="semibold">{intent}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>CITY</Text>
          <Text variant="bodySmall" weight="semibold">{city ?? '—'}</Text>
        </View>
      </View>
    </View>
  );
});

ProfileInfoBox.displayName = 'ProfileInfoBox';

const styles = StyleSheet.create({
  infoBox: {
    backgroundColor: `${colors.card}E6`,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  cell: {
    flex: 1,
    minWidth: '40%',
  },
  label: {
    marginBottom: spacing[1],
  },
});
