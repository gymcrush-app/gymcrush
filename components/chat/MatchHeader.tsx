import React from 'react';
import { Alert, View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, MoreHorizontal } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import type { MatchWithProfile } from '@/types';
import { colors, fontSize, fontFamily, spacing } from '@/theme';
import { useUserProfileModal } from '@/lib/contexts/UserProfileModalContext';

interface MatchHeaderProps {
  match: MatchWithProfile;
  onBack: () => void;
  onReportAndBlock?: (userId: string) => void;
}

export function MatchHeader({ match, onBack, onReportAndBlock }: MatchHeaderProps) {
  const { openUserProfile } = useUserProfileModal();

  const handleAvatarPress = () => {
    openUserProfile(match.otherUser.id);
  };

  const handleMorePress = () => {
    Alert.alert(
      'Report & Block',
      `Are you sure you want to report and block ${match.otherUser.display_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report & Block',
          style: 'destructive',
          onPress: () => onReportAndBlock?.(match.otherUser.id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <ChevronLeft size={24} color={colors.foreground} />
      </Pressable>
      <View style={styles.centerContent}>
        <Pressable onPress={handleAvatarPress}>
          <Avatar
            uri={match.otherUser.photo_urls?.[0] || null}
            size="md"
            name={match.otherUser.display_name}
          />
        </Pressable>
        <Text style={styles.name}>{match.otherUser.display_name}</Text>
      </View>
      <Pressable onPress={handleMorePress} style={styles.moreButton}>
        <MoreHorizontal size={20} color={colors.mutedForeground} />
      </Pressable>
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
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
    marginTop: spacing[2],
  },
  moreButton: {
    padding: spacing[2],
    marginRight: -spacing[2],
    width: 40,
    alignItems: 'center',
  },
});
