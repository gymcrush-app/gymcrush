import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { filterBadWords } from '@/lib/utils/filterBadWords';
import { useLike } from './matches';
import type { Message, MatchWithProfile, Profile } from '@/types';

/** Match-based thread in Chat (existing behavior). */
export type ConversationMatch = MatchWithProfile & {
  kind?: 'match';
  lastMessage?: Message;
  unreadCount: number;
  /** True when match has no messages and current user has not yet viewed the match (show "new" dot). */
  isNewMatch?: boolean;
};

/**
 * Gym Gem received when there is no mutual match yet: backed by messages.gem_gift_id + to_user_id.
 */
export type ConversationGemInbox = {
  kind: 'gem_inbox';
  rowId: string;
  otherUser: Profile;
  lastMessage: Message;
  unreadCount: number;
};

export type Conversation = ConversationMatch | ConversationGemInbox;

/**
 * Fetch all conversations for the current user with last message and unread count
 */
export function useConversations() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      try {
        if (!user) return [];

        // Fetch matches with user profiles
        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            user1:profiles!matches_user1_id_fkey(*),
            user2:profiles!matches_user2_id_fkey(*)
          `)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        if (matchesError) {
          console.error('Error fetching matches:', matchesError);
          throw matchesError;
        }

        // Filter out matches with missing user profiles
        const validMatches = (matches || []).filter((match: any) => {
          const hasUser1 = match.user1 && match.user1.id;
          const hasUser2 = match.user2 && match.user2.id;
          if (!hasUser1 || !hasUser2) {
            console.warn(`Match ${match.id} has missing user profile(s). user1: ${hasUser1}, user2: ${hasUser2}`);
            return false;
          }
          return true;
        });

        const matchPartnerIds = new Set(
          validMatches.map((m: any) => (m.user1_id === user.id ? m.user2_id : m.user1_id) as string),
        );

        // Fetch which matches the current user has viewed (for "new match" dot)
        const { data: viewedRows } = await supabase
          .from('match_views')
          .select('match_id')
          .eq('user_id', user.id);
        const viewedMatchIds = new Set((viewedRows || []).map((r: { match_id: string }) => r.match_id));

        const matchConversations: ConversationMatch[] =
          validMatches.length === 0
            ? []
            : await Promise.all(
                validMatches.map(async (match: any) => {
                  const otherUser = match.user1_id === user.id ? match.user2 : match.user1;

                  if (!otherUser) {
                    console.error(
                      `Match ${match.id} is missing otherUser. user1_id: ${match.user1_id}, user2_id: ${match.user2_id}`,
                    );
                    throw new Error(`Match ${match.id} is missing user profile data`);
                  }

                  if (!Array.isArray(otherUser.photo_urls)) {
                    otherUser.photo_urls = [];
                  }

                  const { data: lastMessages, error: lastMessageError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('match_id', match.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (lastMessageError && lastMessageError.code !== 'PGRST116') {
                    throw lastMessageError;
                  }

                  const { count, error: countError } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('match_id', match.id)
                    .eq('sender_id', otherUser.id)
                    .is('read_at', null);

                  if (countError) {
                    console.error(`Error getting unread count for match ${match.id}:`, countError);
                  }

                  return {
                    ...match,
                    otherUser,
                    lastMessage: lastMessages || undefined,
                    unreadCount: count || 0,
                    isNewMatch: !lastMessages && !viewedMatchIds.has(match.id),
                  } as ConversationMatch;
                }),
              );

        const { data: gemMsgRows, error: gemMsgError } = await supabase
          .from('messages')
          .select(
            `
            *,
            sender:profiles!messages_sender_id_fkey(*)
          `,
          )
          .eq('to_user_id', user.id)
          .is('match_id', null)
          .not('gem_gift_id', 'is', null)
          .order('created_at', { ascending: false });

        if (gemMsgError) {
          console.error('Error fetching gem inbox messages:', gemMsgError);
          throw gemMsgError;
        }

        const gemSendersSeen = new Set<string>();
        const gemInbox: ConversationGemInbox[] = [];
        for (const row of gemMsgRows || []) {
          const sender = row.sender as Profile | null;
          if (!sender?.id) continue;
          if (matchPartnerIds.has(sender.id)) continue;
          if (gemSendersSeen.has(sender.id)) continue;
          gemSendersSeen.add(sender.id);
          if (!Array.isArray(sender.photo_urls)) sender.photo_urls = [];
          const msg = row as Message;
          gemInbox.push({
            kind: 'gem_inbox',
            rowId: `gem-inbox-${sender.id}`,
            otherUser: sender,
            lastMessage: msg,
            unreadCount: msg.read_at ? 0 : 1,
          });
        }

        const merged: Conversation[] = [...matchConversations, ...gemInbox];
        return merged.sort((a, b) => {
          const aTime =
            a.kind === 'gem_inbox'
              ? new Date(a.lastMessage.created_at || 0).getTime()
              : a.lastMessage?.created_at
                ? new Date(a.lastMessage.created_at).getTime()
                : 0;
          const bTime =
            b.kind === 'gem_inbox'
              ? new Date(b.lastMessage.created_at || 0).getTime()
              : b.lastMessage?.created_at
                ? new Date(b.lastMessage.created_at).getTime()
                : 0;
          return bTime - aTime;
        });
      } catch (error) {
        console.error('Error in useConversations queryFn:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Set up real-time subscription for all messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Invalidate conversations when any message changes
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

/**
 * Chat hook for a specific match with pagination, real-time updates, and message sending
 */
export function useChat(matchId: string) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Paginated messages query - fetch oldest first for normal display (newest at bottom)
  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', matchId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })
        .range(pageParam, pageParam + 49); // 50 messages per page

      if (error) throw error;
      return {
        messages: (data || []) as Message[],
        nextPage: data && data.length === 50 ? pageParam + 50 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!matchId && !!user,
  });

  // Real-time subscription
  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user, queryClient]);

  // Send message with optimistic update
  const sendMessage = useMutation({
    mutationFn: async (payload: {
      content: string;
      reactionType?: 'prompt' | 'image';
      reactionPromptTitle?: string;
      reactionPromptAnswer?: string;
      reactionImageUrl?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { content, reactionType, reactionPromptTitle, reactionPromptAnswer, reactionImageUrl } = payload;
      const reactionPayload =
        reactionType !== undefined
          ? {
              reaction_type: reactionType,
              ...(reactionType === 'prompt' && reactionPromptTitle !== undefined
                ? {
                    reaction_prompt_title: filterBadWords(reactionPromptTitle),
                    reaction_prompt_answer: reactionPromptAnswer != null ? filterBadWords(reactionPromptAnswer) : null,
                  }
                : reactionType === 'image' && reactionImageUrl !== undefined
                  ? { reaction_image_url: reactionImageUrl }
                  : {}),
            }
          : {};
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: user.id,
          content: filterBadWords(content).trim(),
          ...reactionPayload,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Message;
    },
    onMutate: async (payload) => {
      const { content } = payload;
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', matchId] });
      const previousData = queryClient.getQueryData(['messages', matchId]);

      // Add optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        match_id: matchId,
        sender_id: user!.id,
        to_user_id: null,
        content: filterBadWords(content).trim(),
        created_at: new Date().toISOString(),
        read_at: null,
        gem_gift_id: null,
        reaction_type: payload.reactionType ?? null,
        reaction_prompt_title: payload.reactionPromptTitle ?? null,
        reaction_prompt_answer: payload.reactionPromptAnswer ?? null,
        reaction_image_url: payload.reactionImageUrl ?? null,
      };

      queryClient.setQueryData(['messages', matchId], (old: any) => {
        if (!old) return old;
        const newPages = [...old.pages];
        // Add optimistic message to the last page (newest messages)
        const lastPageIndex = newPages.length - 1;
        if (newPages[lastPageIndex]) {
          newPages[lastPageIndex] = {
            ...newPages[lastPageIndex],
            messages: [...newPages[lastPageIndex].messages, optimisticMessage],
          };
        }
        return { ...old, pages: newPages };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['messages', matchId], context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (messageIds?: string[]) => {
      let query = supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .neq('sender_id', user!.id) // Only mark messages from other user
        .is('read_at', null);

      if (messageIds && messageIds.length > 0) {
        query = query.in('id', messageIds);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['conversations', user?.id] });
      const previous = queryClient.getQueryData<Conversation[]>(['conversations', user?.id]);
      queryClient.setQueryData<Conversation[]>(['conversations', user?.id], (old) => {
        if (!old) return old;
        return old.map((c) =>
          c.kind === 'gem_inbox' ? c : c.id === matchId ? { ...c, unreadCount: 0 } : c,
        );
      });
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(['conversations', user?.id], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });

  // Flatten messages from pages (already sorted oldest to newest)
  const messages = messagesQuery.data?.pages.flatMap((page) => page.messages) || [];

  return {
    messages,
    loading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage: useCallback(
      (
        content: string,
        reactionContext?: {
          reactionType?: 'prompt' | 'image';
          reactionPromptTitle?: string;
          reactionPromptAnswer?: string;
          reactionImageUrl?: string;
        }
      ) =>
        sendMessage.mutate({
          content,
          ...reactionContext,
        }),
      [sendMessage]
    ),
    markAsRead: useCallback(
      (messageIds?: string[]) => markAsRead.mutate(messageIds),
      [markAsRead]
    ),
    loadMore: useCallback(() => {
      if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
        messagesQuery.fetchNextPage();
      }
    }, [messagesQuery]),
    hasMore: messagesQuery.hasNextPage,
  };
}

/**
 * Legacy hook - kept for backward compatibility
 * Use useChat() instead for new code
 */
export function useMessages(matchId: string) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!matchId && !!user,
  });

  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user, queryClient]);

  return query;
}

export function useSendMessage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, content }: { matchId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: user.id,
          content: filterBadWords(content).trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as Message;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.match_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });
}

export function useMarkAsRead() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, messageIds }: { matchId: string; messageIds?: string[] }) => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .neq('sender_id', user.id) // Only mark messages from other user
        .is('read_at', null);

      if (messageIds && messageIds.length > 0) {
        query = query.in('id', messageIds);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });
}

export type MessageRequest = {
  sender: Profile;
  lastMessage: Message;
  unreadCount: number;
};

/**
 * Fetch message requests for the current user (messages sent without mutual match)
 * Excludes senders the user has declined (request_ignores).
 */
export function useMessageRequests() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messageRequests', user?.id],
    queryFn: async (): Promise<MessageRequest[]> => {
      try {
        if (!user) return [];

        // Fetch ignored sender IDs for this user
        const { data: ignoredRows } = await supabase
          .from('request_ignores')
          .select('sender_id')
          .eq('user_id', user.id);
        const ignoredSenderIds = new Set((ignoredRows || []).map((r: { sender_id: string }) => r.sender_id));

        // Fetch messages where current user is recipient and match_id is NULL
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*, sender:profiles!messages_sender_id_fkey(*)')
          .eq('to_user_id', user.id)
          .is('match_id', null)
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.error('Error fetching message requests:', messagesError);
          throw messagesError;
        }
        if (!messages || messages.length === 0) return [];

        // Group messages by sender
        const requestsBySender = new Map<string, MessageRequest>();

        for (const msg of messages) {
          const senderId = msg.sender_id;
          if (!senderId || !msg.sender) continue;
          if (ignoredSenderIds.has(senderId)) continue;

          if (!requestsBySender.has(senderId)) {
            // Check if there's a mutual match (if so, this shouldn't be a request)
            const { data: match } = await supabase
              .from('matches')
              .select('*')
              .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
              .or(`user1_id.eq.${senderId},user2_id.eq.${senderId}`)
              .single();

            // If match exists, skip this request (it should be in conversations)
            if (match) continue;

            requestsBySender.set(senderId, {
              sender: msg.sender,
              lastMessage: msg as Message,
              unreadCount: 0,
            });
          } else {
            const request = requestsBySender.get(senderId)!;
            // Update if this message is newer
            if (new Date(msg.created_at ?? 0) > new Date(request.lastMessage.created_at ?? 0)) {
              request.lastMessage = msg as Message;
            }
          }
        }

        // Count unread messages for each sender
        for (const [senderId, request] of requestsBySender.entries()) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('to_user_id', user.id)
            .eq('sender_id', senderId)
            .is('match_id', null)
            .is('read_at', null);

          request.unreadCount = count || 0;
        }

        // Sort by last message timestamp (most recent first)
        return Array.from(requestsBySender.values()).sort((a, b) => {
          const aTime = new Date(a.lastMessage.created_at ?? 0).getTime();
          const bTime = new Date(b.lastMessage.created_at ?? 0).getTime();
          return bTime - aTime;
        });
      } catch (error) {
        console.error('Error in useMessageRequests queryFn:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Set up real-time subscription for message requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messageRequests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messageRequests', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

/**
 * Decline a message request (hide from list for current user).
 * Upserts into request_ignores (idempotent); does not delete messages.
 */
export function useDeclineRequest() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ senderId }: { senderId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('request_ignores')
        .upsert(
          { user_id: user.id, sender_id: senderId },
          { onConflict: 'user_id,sender_id', ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRequests', user?.id] });
    },
  });
}

/**
 * Fetch messages for a single message request thread (no match yet).
 * Used on the request-detail screen.
 */
export function useRequestMessages(senderId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['requestMessages', user?.id, senderId],
    queryFn: async (): Promise<Message[]> => {
      if (!user || !senderId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('sender_id', senderId)
        .is('match_id', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!user && !!senderId,
  });
}

/**
 * Migrate request messages (to_user_id + sender_id, match_id null) to a match.
 * Call after creating a match on accept so the chat shows the request messages.
 */
export function useMigrateRequestToMatch() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      senderId,
      matchId,
    }: {
      senderId: string;
      matchId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('messages')
        .update({ match_id: matchId })
        .eq('to_user_id', user.id)
        .eq('sender_id', senderId)
        .is('match_id', null);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['messageRequests', user?.id] });
    },
  });
}

/**
 * Send a message request (message from prompt/image chat without mutual match)
 * This creates a like (swipe up) and sends the message
 */
export type SendMessageRequestParams = {
  toUserId: string;
  content: string;
  reactionType?: 'prompt' | 'image';
  reactionPromptTitle?: string;
  reactionPromptAnswer?: string;
  reactionImageUrl?: string;
};

export function useSendMessageRequest() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const likeMutation = useLike();

  return useMutation({
    mutationFn: async ({
      toUserId,
      content,
      reactionType,
      reactionPromptTitle,
      reactionPromptAnswer,
      reactionImageUrl,
    }: SendMessageRequestParams) => {
      if (!user) throw new Error('Not authenticated');

      // Step 1: Create like (swipe up) if not already exists
      try {
        await likeMutation.mutateAsync({ toUserId });
      } catch (error: any) {
        // Ignore error if like already exists (unique constraint violation)
        if (error?.code !== '23505') {
          console.error('Error creating like:', error);
          // Continue anyway - the like might already exist
        }
      }

      // Step 2: Check if mutual match exists (wait a bit for trigger to create match)
      await new Promise(resolve => setTimeout(resolve, 200));

      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${toUserId},user2_id.eq.${toUserId}`)
        .maybeSingle();

      const reactionPayload =
        reactionType !== undefined
          ? {
              reaction_type: reactionType,
              ...(reactionType === 'prompt' && reactionPromptTitle !== undefined
                ? {
                    reaction_prompt_title: filterBadWords(reactionPromptTitle),
                    reaction_prompt_answer: reactionPromptAnswer != null ? filterBadWords(reactionPromptAnswer) : null,
                  }
                : reactionType === 'image' && reactionImageUrl !== undefined
                  ? { reaction_image_url: reactionImageUrl }
                  : {}),
            }
          : {};

      // Step 3: Send message
      if (match) {
        // If match exists, send message with match_id
        const { data, error } = await supabase
          .from('messages')
          .insert({
            match_id: match.id,
            sender_id: user.id,
            content: filterBadWords(content).trim(),
            ...reactionPayload,
          })
          .select()
          .single();

        if (error) throw error;
        return data as Message;
      } else {
        // If no match, send message request (to_user_id, no match_id)
        const { data, error } = await supabase
          .from('messages')
          .insert({
            to_user_id: toUserId,
            sender_id: user.id,
            content: filterBadWords(content).trim(),
            ...reactionPayload,
          })
          .select()
          .single();

        if (error) throw error;
        return data as Message;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageRequests'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
