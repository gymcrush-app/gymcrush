import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import type { Profile } from '@/types';
import { colors, fontSize, fontWeight, spacing } from '@/theme';
import { useUserProfileModal } from '@/lib/contexts/UserProfileModalContext';

interface RequestHeaderProps {
  sender: Profile;
  onBack: () => void;
}

export function RequestHeader({ sender, onBack }: RequestHeaderProps) {
  const { openUserProfile } = useUserProfileModal();

  const handleAvatarPress = () => {
    openUserProfile(sender.id);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <ChevronLeft size={24} color={colors.foreground} />
      </Pressable>
      <View style={styles.centerContent}>
        <Pressable onPress={handleAvatarPress}>
          <Avatar
            uri={sender.photo_urls?.[0] || null}
            size="md"
            name={sender.display_name}
          />
        </Pressable>
        <Text style={styles.name}>{sender.display_name}</Text>
      </View>
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginTop: spacing[2],
  },
  rightSpacer: {
    width: 40,
  },
});
