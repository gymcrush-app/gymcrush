import { ChatInput } from '@/components/chat/ChatInput';
import { RequestHeader } from '@/components/chat/RequestHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { useProfileById } from '@/lib/api/profiles';
import {
  useRequestMessages,
  useDeclineRequest,
  useMigrateRequestToMatch,
  useChat,
} from '@/lib/api/messages';
import { useLike } from '@/lib/api/matches';
import { useAuthStore } from '@/lib/stores/authStore';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import type { Message } from '@/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

const MATCH_LOOKUP_RETRIES = 2;
const MATCH_LOOKUP_DELAY_MS = 200;

export default function RequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { senderId } = useLocalSearchParams<{ senderId: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [acceptedMatchId, setAcceptedMatchId] = useState<string | null>(null);
  const [acceptingInProgress, setAcceptingInProgress] = useState(false);

  const { data: sender, isLoading: senderLoading } = useProfileById(senderId || '');
  const { data: requestMessagesData = [], isLoading: messagesLoading } = useRequestMessages(
    senderId || ''
  );
  const chat = useChat(acceptedMatchId || '');
  const likeMutation = useLike();
  const declineMutation = useDeclineRequest();
  const migrateMutation = useMigrateRequestToMatch();

  const messages = acceptedMatchId ? (chat.messages ?? []) : requestMessagesData;
  const showRequestActions = !acceptedMatchId && !acceptingInProgress;
  const handleAccept = useCallback(() => {
    if (!user || !senderId) return;
    setAcceptingInProgress(true);
    const runAccept = async () => {
      try {
        await likeMutation.mutateAsync({ toUserId: senderId });
        let match: { id: string } | null = null;
        for (let attempt = 0; attempt < MATCH_LOOKUP_RETRIES; attempt++) {
          await new Promise((r) => setTimeout(r, MATCH_LOOKUP_DELAY_MS));
          const { data } = await supabase
            .from('matches')
            .select('id')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .or(`user1_id.eq.${senderId},user2_id.eq.${senderId}`)
            .maybeSingle();
          if (data) {
            match = data;
            break;
          }
        }
        if (match) {
          await migrateMutation.mutateAsync({ senderId, matchId: match.id });
          setAcceptedMatchId(match.id);
          // Ensure Messages tab list refetches so the new conversation appears
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
            queryClient.invalidateQueries({ queryKey: ['messageRequests', user.id] });
          }
        } else {
          setAcceptingInProgress(false);
          router.back();
        }
      } catch (e) {
        setAcceptingInProgress(false);
        toast({
          preset: 'error',
          title: 'Accept failed',
          message: e instanceof Error ? e.message : 'Something went wrong',
        });
      }
    };
    runAccept();
  }, [user, senderId, likeMutation, migrateMutation, router, queryClient]);

  const handleDecline = useCallback(async () => {
    if (!senderId) return;
    try {
      await declineMutation.mutateAsync({ senderId });
      router.back();
    } catch (e) {
      toast({
        preset: 'error',
        title: 'Decline failed',
        message: e instanceof Error ? e.message : 'Something went wrong',
      });
    }
  }, [senderId, declineMutation, router]);

  const handleSend = useCallback(
    (content: string) => {
      if (acceptedMatchId) chat.sendMessage(content);
    },
    [acceptedMatchId, chat]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isSent = item.sender_id === user?.id;
      return <MessageBubble message={item} isSent={isSent} />;
    },
    [user?.id]
  );

  if (!senderId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Missing sender</Text>
      </View>
    );
  }

  if (senderLoading || !sender) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const accepting =
    likeMutation.isPending || migrateMutation.isPending;
  const declining = declineMutation.isPending;
  const messagesLoadingState = showRequestActions ? messagesLoading : chat.loading;
  const inputDisabled = acceptingInProgress ? true : chat.loading;

  const content = (
    <>
      <RequestHeader sender={sender} onBack={() => router.back()} />
      {messagesLoadingState ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <MessageSquare size={48} color={colors.mutedForeground} />
              </View>
              <Text style={styles.emptyTitle}>No messages</Text>
            </View>
          }
        />
      )}
      {showRequestActions ? (
        <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Pressable
            style={({ pressed }) => [
              styles.acceptButton,
              (accepting || declining) && styles.buttonDisabled,
              pressed && !accepting && !declining && styles.buttonPressed,
            ]}
            onPress={handleAccept}
            disabled={accepting || declining}
          >
            {accepting ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={styles.acceptButtonText}>Accept</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.declineButton,
              (accepting || declining) && styles.buttonDisabled,
              pressed && !accepting && !declining && styles.buttonPressed,
            ]}
            onPress={handleDecline}
            disabled={accepting || declining}
          >
            {declining ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <Text style={styles.declineButtonText}>Decline</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.inputAreaContainer}>
          {acceptingInProgress && !acceptedMatchId && (
            <Text style={styles.acceptingLabel}>Accepting…</Text>
          )}
          <ChatInput onSend={handleSend} disabled={inputDisabled} />
        </View>
      )}
    </>
  );

  const containerStyle = [
    styles.container,
    { paddingTop: Math.max(insets.top, spacing[4]) },
  ];

  if (acceptedMatchId || acceptingInProgress) {
    return (
      <KeyboardAvoidingView
        style={containerStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.destructive,
    padding: spacing[4],
  },
  messagesContainer: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[8],
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
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
  },
  actionsContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  inputAreaContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  acceptingLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.ring,
  },
  acceptButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.primaryForeground,
  },
  declineButton: {
    backgroundColor: colors.muted,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  declineButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeMedium,
    color: colors.foreground,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
