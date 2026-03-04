import { Text } from '@/components/ui/Text';
import { fontSize, spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProfileHeaderProps {
  displayName: string;
  age: number;
}

export const ProfileHeader = React.memo<ProfileHeaderProps>(({ displayName, age }) => {
  return (
    <View style={styles.container}>
      <Text variant="h1" style={{ fontSize: fontSize['4xl'] }}>
        {displayName}, {age}
      </Text>
    </View>
  );
});

ProfileHeader.displayName = 'ProfileHeader';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[2],
  },
});
