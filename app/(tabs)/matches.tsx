import { Avatar } from '@/components/ui/Avatar';
import type { MatchWithProfile } from '@/types';
import { useMatches } from '@/lib/api/matches';
import { useAuthStore } from '@/lib/stores/authStore';
import { formatRelativeTime, truncateText } from '@/lib/utils/formatting';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MatchRowProps {
  item: MatchWithProfile;
  currentUserId: string | undefined;
  onPress: (matchId: string) => void;
}

const MatchRow = React.memo(function MatchRow({ item, currentUserId, onPress }: MatchRowProps) {
  const lastMessagePreview = item.lastMessage
    ? truncateText(item.lastMessage.content, 50)
    : 'Start a conversation';
  const timestamp = item.lastMessage
    ? formatRelativeTime(item.lastMessage.created_at || '')
    : '';
  const isFromCurrentUser = item.lastMessage?.sender_id === currentUserId;
  const gymName = item.otherUser.home_gym_id ? 'Gym' : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.matchItem,
        pressed && styles.matchItemPressed,
      ]}
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${item.otherUser.display_name}`}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          uri={item.otherUser.photo_urls?.[0] ?? null}
          size="lg"
          name={item.otherUser.display_name}
        />
        {Number(item.unreadCount) > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {(item.unreadCount ?? 0) > 99 ? '99+' : (item.unreadCount ?? 0)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.name,
              (item.unreadCount ?? 0) > 0 && styles.nameUnread,
            ]}
          >
            {item.otherUser.display_name}
          </Text>
          {item.otherUser.age && (
            <Text style={styles.age}>{item.otherUser.age}</Text>
          )}
        </View>
        {gymName && (
          <Text style={styles.gym} numberOfLines={1}>
            {gymName}
          </Text>
        )}
        {item.lastMessage && (
          <View style={styles.messagePreview}>
            <Text
              style={[
                styles.preview,
                (item.unreadCount ?? 0) > 0 && styles.previewUnread,
              ]}
              numberOfLines={1}
            >
              {isFromCurrentUser && 'You: '}
              {lastMessagePreview}
            </Text>
            {timestamp && (
              <Text style={styles.timestamp}>{timestamp}</Text>
            )}
          </View>
        )}
        {!item.lastMessage && (
          <Text style={styles.noMessage}>Tap to start chatting</Text>
        )}
      </View>
    </Pressable>
  );
});

export default function MatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { data: matches = [], isLoading, error, refetch } = useMatches();

  const onPressMatch = useCallback(
    (matchId: string) => {
      router.push({ pathname: '/(tabs)/chat/[matchId]', params: { matchId } });
    },
    [router]
  );

  const renderMatchItem = useCallback(
    ({ item }: { item: MatchWithProfile }) => (
      <MatchRow item={item} currentUserId={user?.id} onPress={onPressMatch} />
    ),
    [user?.id, onPressMatch]
  );

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading matches</Text>
          {error instanceof Error && (
            <Text style={styles.errorDetail}>{error.message}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, spacing[4]) },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
      </View>

      {matches.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Users size={48} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            Start swiping to find your gym crush!
          </Text>
        </View>
      ) : (
        <FlashList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  listContent: {
    paddingVertical: spacing[2],
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[4],
  },
  matchItemPressed: {
    backgroundColor: colors.muted,
    opacity: 0.8,
  },
  avatarContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing[1],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.secondaryForeground,
  },
  contentContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[0.5],
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    flex: 1,
  },
  nameUnread: {
    fontWeight: fontWeight.semibold,
  },
  age: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  gym: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[1],
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  preview: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    flex: 1,
  },
  previewUnread: {
    color: colors.foreground,
    fontWeight: fontWeight.medium,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  noMessage: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing[20],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.destructive,
    marginBottom: spacing[2],
  },
  errorDetail: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
