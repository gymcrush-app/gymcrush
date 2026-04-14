import { Text } from '@/components/ui/Text';
import { borderRadius, colors, spacing } from '@/theme';
import { Baby, Beer, BookOpen, Cannabis, Cigarette, Globe } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const ICON_SIZE = 20;
const ICON_COLOR = colors.mutedForeground;

interface ProfileLifestyleBoxProps {
  ethnicity: string[] | null;
  religion: string | null;
  alcohol: string | null;
  smoking: string | null;
  marijuana: string | null;
  hasKids: string | null;
}

export const ProfileLifestyleBox = React.memo<ProfileLifestyleBoxProps>(({
  ethnicity,
  religion,
  alcohol,
  smoking,
  marijuana,
  hasKids,
}) => {
  const ethnicityDisplay = ethnicity && ethnicity.length > 0
    ? ethnicity.join(', ')
    : '—';

  return (
    <View style={styles.infoBox}>
      <View style={styles.row}>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <Globe size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{ethnicityDisplay}</Text>
          </View>
        </View>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <BookOpen size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{religion ?? '—'}</Text>
          </View>
        </View>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <Baby size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{hasKids ?? '—'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <Beer size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{alcohol ?? '—'}</Text>
          </View>
        </View>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <Cigarette size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{smoking ?? '—'}</Text>
          </View>
        </View>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <Cannabis size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{marijuana ?? '—'}</Text>
          </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-evenly', gap: spacing[4] },
  cell: { flex: 1, alignItems: 'center' },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
});
