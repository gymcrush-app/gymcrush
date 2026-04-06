import { Text } from '@/components/ui/Text';
import { borderRadius, colors, spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProfileLifestyleBoxProps {
  religion: string | null;
  alcohol: string | null;
  smoking: string | null;
  marijuana: string | null;
  hasKids: string | null;
}

export const ProfileLifestyleBox = React.memo<ProfileLifestyleBoxProps>(({
  religion,
  alcohol,
  smoking,
  marijuana,
  hasKids,
}) => {
  return (
    <View style={styles.infoBox}>
      <View style={styles.topRow}>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>RELIGION</Text>
          <Text variant="bodySmall" weight="semibold">{religion ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>ALCOHOL</Text>
          <Text variant="bodySmall" weight="semibold">{alcohol ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>CIGS</Text>
          <Text variant="bodySmall" weight="semibold">{smoking ?? '—'}</Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>POT</Text>
          <Text variant="bodySmall" weight="semibold">{marijuana ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="mutedXSmall" style={styles.label}>KIDS</Text>
          <Text variant="bodySmall" weight="semibold">{hasKids ?? '—'}</Text>
        </View>
      </View>
    </View>
  );
});

ProfileLifestyleBox.displayName = 'ProfileLifestyleBox';

const styles = StyleSheet.create({
  infoBox: {
    backgroundColor: `${colors.card}E6`,
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[4],
  },
  topRow: { flexDirection: 'row', gap: spacing[4] },
  bottomRow: { flexDirection: 'row', gap: spacing[4] },
  cell: { flex: 1 },
  label: { marginBottom: spacing[1] },
});
