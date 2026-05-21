import { Text } from '@/components/ui/Text';
import { useBlockedProfiles, useUnblockUser } from '@/lib/api/safety';
import { toast } from '@/lib/toast';
import { borderRadius, colors, fontFamily, fontSize, spacing } from '@/theme';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, UserMinus } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { data: blockedProfiles, isLoading } = useBlockedProfiles();
  const unblock = useUnblockUser();

  const confirmUnblock = (id: string, name: string | null) => {
    Alert.alert(
      'Unblock?',
      `${name ?? 'This person'} will be able to see your profile and message you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: () => {
            unblock.mutate(
              { blockedUserId: id },
              {
                onError: (error) => {
                  toast({
                    preset: 'error',
                    title: 'Could not unblock',
                    message: (error as any)?.message ?? 'Please try again.',
                  });
                },
              },
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !blockedProfiles || blockedProfiles.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyHint}>
            People you block from a profile or chat will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedProfiles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const photo = item.photo_urls?.[0];
            return (
              <View style={styles.row}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]} />
                )}
                <Text style={styles.name} numberOfLines={1}>
                  {item.display_name ?? 'Unnamed'}
                </Text>
                <Pressable
                  onPress={() => confirmUnblock(item.id, item.display_name)}
                  style={styles.unblockButton}
                  hitSlop={8}
                >
                  <UserMinus size={16} color={colors.primary} />
                  <Text style={styles.unblockText}>Unblock</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
  },
  headerSpacer: {
    width: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[2],
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing[4],
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.muted,
  },
  avatarPlaceholder: {
    backgroundColor: colors.muted,
  },
  name: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeMedium,
    color: colors.foreground,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unblockText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.primary,
  },
});
