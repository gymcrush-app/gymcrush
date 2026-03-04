import { Text } from '@/components/ui/Text';
import { fontSize, spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface AboutSectionProps {
  bio: string | null;
}

export const AboutSection = React.memo<AboutSectionProps>(({ bio }) => {
  if (!bio) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text variant="h4" style={styles.title}>ABOUT</Text>
      <Text variant="body" style={{ lineHeight: fontSize.base * 1.5 }}>
        {bio}
      </Text>
    </View>
  );
});

AboutSection.displayName = 'AboutSection';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[6],
  },
  title: {
    marginBottom: spacing[2],
  },
});
