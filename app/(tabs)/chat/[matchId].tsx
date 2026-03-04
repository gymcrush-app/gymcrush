import { ChatInput } from '@/components/chat/ChatInput';
import { MatchHeader } from '@/components/chat/MatchHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { useMatchById, useMarkMatchViewed } from '@/lib/api/matches';
import { useChat } from '@/lib/api/messages';
import { useAuthStore } from '@/lib/stores/authStore';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { Message } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const user = useAuthStore((s) => s.user);
  const flashListRef = useRef<React.ElementRef<typeof FlashList<Message>>>(null);
  const hasMarkedAsReadRef = useRef(false);
  const markMatchViewed = useMarkMatchViewed();
  const { data: match, isLoading: matchLoading, isError: matchError } = useMatchById(
    matchId || ''
  );
  const { messages, loading, sendMessage, markAsRead, loadMore, hasMore } = useChat(
    matchId || ''
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Mark messages as read and mark match as viewed when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!matchId) return;
      // Mark this match as viewed (hides "new match" dot)
      markMatchViewed.mutate({ matchId });
      if (messages.length > 0) {
        const unreadMessageIds = messages
          .filter(
            (msg) =>
              msg.sender_id !== user?.id &&
              !msg.read_at &&
              msg.match_id === matchId
          )
          .map((msg) => msg.id);

        if (unreadMessageIds.length > 0) {
          markAsRead(unreadMessageIds);
        }
      }
    }, [matchId, messages, user?.id, markAsRead, markMatchViewed])
  );

  // Also mark as read when messages load (focus effect may have run with messages=[] before load)
  useEffect(() => {
    if (!matchId || !user || messages.length === 0) return;
    const unreadMessageIds = messages
      .filter(
        (msg) =>
          msg.sender_id !== user.id &&
          !msg.read_at &&
          msg.match_id === matchId
      )
      .map((msg) => msg.id);
    if (unreadMessageIds.length === 0) {
      hasMarkedAsReadRef.current = false;
      return;
    }
    if (!hasMarkedAsReadRef.current) {
      hasMarkedAsReadRef.current = true;
      markAsRead(unreadMessageIds);
    }
  }, [matchId, user?.id, messages, markAsRead]);

  // Reset ref when switching to a different match
  useEffect(() => {
    hasMarkedAsReadRef.current = false;
  }, [matchId]);

  const handleSend = (content: string) => {
    if (matchId) {
      sendMessage(content);
    }
  };

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isSent = item.sender_id === user?.id;
      return <MessageBubble message={item} isSent={isSent} />;
    },
    [user?.id]
  );

  if (!matchId) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Missing conversation</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (matchLoading && !match) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading conversation…</Text>
        </View>
      </View>
    );
  }

  if ((matchError || !match) && !matchLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <MessageSquare size={48} color={colors.mutedForeground} />
          <Text style={styles.errorTitle}>Conversation not found</Text>
          <Text style={styles.errorSubtitle}>
            This chat may have been removed or you don't have access to it.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, spacing[4]) },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <MatchHeader match={match!} onBack={() => router.back()} />
      <FlashList
        ref={flashListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onScroll={(event) => {
          const { contentOffset } = event.nativeEvent;
          if (contentOffset.y < 200 && hasMore && !loading) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <MessageSquare size={48} color={colors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Start the conversation!
            </Text>
          </View>
        }
      />
      <ChatInput onSend={handleSend} disabled={loading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesContainer: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[2],
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.destructive,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginTop: spacing[4],
  },
  errorSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing[2],
    paddingHorizontal: spacing[6],
  },
  backButton: {
    marginTop: spacing[6],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[8],
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
});
