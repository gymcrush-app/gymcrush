import { Text } from '@/components/ui/Text';
import { borderRadius, colors, spacing } from '@/theme';
import { Briefcase, Heart, MapPin, Ruler } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const ICON_SIZE = 14;
const ICON_COLOR = colors.mutedForeground;

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
          <View style={styles.iconRow}>
            <Ruler size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{height ?? '—'}</Text>
          </View>
        </View>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <Briefcase size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{occupation ?? '—'}</Text>
          </View>
        </View>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <Heart size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{intent}</Text>
          </View>
        </View>
        <View style={styles.cell}>
          <View style={styles.iconRow}>
            <MapPin size={ICON_SIZE} color={ICON_COLOR} />
            <Text variant="bodySmall" weight="semibold">{city ?? '—'}</Text>
          </View>
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
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
});
