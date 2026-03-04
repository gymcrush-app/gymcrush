/**
 * Matches API — TanStack Query hooks for likes, crush signals, and matches.
 * useLike, useCrushSignal, useMatches, useCheckMatch.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import type { Match, MatchWithProfile } from '@/types';

export function useLike() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ toUserId }: { toUserId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('likes')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          is_crush_signal: false,
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, toUserId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      // Invalidate the specific match check query for this user pair
      if (data.from_user_id && data.toUserId) {
        queryClient.invalidateQueries({ 
          queryKey: ['match', data.from_user_id, data.toUserId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['match', data.toUserId, data.from_user_id] 
        });
      }
    },
  });
}

export function useCrushSignal() {
  const user = useAuthStore((s) => s.user);
  const checkCrushAvailability = useAppStore((s) => s.checkCrushAvailability);
  const recordCrushSignal = useAppStore((s) => s.recordCrushSignal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ toUserId }: { toUserId: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!checkCrushAvailability()) {
        throw new Error('Crush signal cooldown active. Try again tomorrow.');
      }
      const { data, error } = await supabase
        .from('likes')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          is_crush_signal: true,
        })
        .select()
        .single();
      if (error) throw error;
      recordCrushSignal();
      return { ...data, toUserId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      // Invalidate the specific match check query for this user pair
      if (data.from_user_id && data.toUserId) {
        queryClient.invalidateQueries({ 
          queryKey: ['match', data.from_user_id, data.toUserId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['match', data.toUserId, data.from_user_id] 
        });
      }
    },
  });
}

export function useMatches() {
  const user = useAuthStore((s) => s.user);
  
  return useQuery({
    queryKey: ['matches', user?.id],
    queryFn: async (): Promise<MatchWithProfile[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          user1:profiles!matches_user1_id_fkey(*),
          user2:profiles!matches_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Transform data to MatchWithProfile format with otherUser, lastMessage, and unreadCount
      const matchesWithProfile: MatchWithProfile[] = await Promise.all(
        data.map(async (match: any) => {
          const otherUser = match.user1_id === user.id ? match.user2 : match.user1;

          // Get last message
          const { data: lastMessages, error: lastMessageError } = await supabase
            .from('messages')
            .select('*')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          // Ignore error if no messages exist (PGRST116 is "no rows returned")
          if (lastMessageError && lastMessageError.code !== 'PGRST116') {
            throw lastMessageError;
          }

          // Get unread count (messages from other user that haven't been read)
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', match.id)
            .eq('sender_id', otherUser.id)
            .is('read_at', null);

          return {
            ...match,
            otherUser,
            lastMessage: lastMessages || undefined,
            unreadCount: count || 0,
          } as MatchWithProfile;
        })
      );

      return matchesWithProfile;
    },
    enabled: !!user,
  });
}

export function useMatchById(matchId: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['match', matchId],
    queryFn: async (): Promise<MatchWithProfile | null> => {
      if (!user || !matchId) return null;
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          user1:profiles!matches_user1_id_fkey(*),
          user2:profiles!matches_user2_id_fkey(*)
        `)
        .eq('id', matchId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const otherUser = data.user1_id === user.id ? data.user2 : data.user1;

      return {
        ...data,
        otherUser,
      } as MatchWithProfile;
    },
    enabled: !!matchId && !!user,
  });
}

export function useCheckMatch(userId1: string, userId2: string) {
  return useQuery({
    queryKey: ['match', userId1, userId2],
    queryFn: async () => {
      // Don't check match if both IDs are the same or either is empty
      if (!userId1 || !userId2 || userId1 === userId2) {
        return null;
      }

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${userId1},user2_id.eq.${userId1}`)
        .or(`user1_id.eq.${userId2},user2_id.eq.${userId2}`)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
    enabled: !!userId1 && !!userId2 && userId1 !== userId2,
  });
}

/**
 * Mark a match as viewed by the current user (opens chat).
 * Used to hide the "new match" dot after the user has seen the match.
 */
export function useMarkMatchViewed() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('match_views').upsert(
        { match_id: matchId, user_id: user.id, viewed_at: new Date().toISOString() },
        { onConflict: 'match_id,user_id' }
      );
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['match', variables.matchId] });
    },
  });
}
