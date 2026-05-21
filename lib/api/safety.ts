/**
 * Safety API — report and block hooks.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { track } from '@/lib/utils/analytics';

type ReportReason = 'inappropriate' | 'fake' | 'harassment' | 'other';

// ── Queries ──────────────────────────────────────────────────────────

/** Fetch the current user's blocked user IDs. */
export function useBlockedUserIds() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['blocks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Cast: blocks table exists in DB but not yet in generated types
      const { data, error } = await (supabase as any)
        .from('blocks')
        .select('blocked_user_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data ?? []).map((b: any) => b.blocked_user_id as string);
    },
    enabled: !!user,
  });
}

export interface BlockedProfileSummary {
  id: string;
  display_name: string | null;
  photo_urls: string[] | null;
}

/** Fetch full profile summaries for the current user's blocks (for the management screen). */
export function useBlockedProfiles() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['blockedProfiles', user?.id],
    queryFn: async (): Promise<BlockedProfileSummary[]> => {
      if (!user) return [];
      // Cast: blocks table exists in DB but not yet in generated types
      const { data: blocks, error } = await (supabase as any)
        .from('blocks')
        .select('blocked_user_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids: string[] = (blocks ?? []).map((b: any) => b.blocked_user_id as string);
      if (ids.length === 0) return [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, photo_urls')
        .in('id', ids);
      if (profilesError) throw profilesError;
      const map = new Map<string, BlockedProfileSummary>(
        (profiles ?? []).map((p: any) => [p.id, p as BlockedProfileSummary]),
      );
      // Preserve block-recency ordering
      return ids.map((id) => map.get(id)).filter((p): p is BlockedProfileSummary => !!p);
    },
    enabled: !!user,
  });
}

// ── Mutations ────────────────────────────────────────────────────────

/** Submit a report against another user. */
export function useReportUser() {
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      reportedUserId,
      reason,
      details,
    }: {
      reportedUserId: string;
      reason: ReportReason;
      details?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
        details: details ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      track('report_submitted');
    },
  });
}

/** Block a user — also creates a report with reason 'other' for audit trail. */
export function useBlockUser() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockedUserId,
      reason = 'other' as ReportReason,
      details,
    }: {
      blockedUserId: string;
      reason?: ReportReason;
      details?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Insert block (ignore duplicate). Cast: blocks table not yet in generated types.
      const { error: blockError } = await (supabase as any).from('blocks').upsert(
        { user_id: user.id, blocked_user_id: blockedUserId },
        { onConflict: 'user_id,blocked_user_id' },
      );
      if (blockError) throw blockError;

      // Also file a report for the moderation audit trail
      await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: blockedUserId,
        reason,
        details: details ?? null,
      });
    },
    onSuccess: () => {
      track('block_user');
      queryClient.invalidateQueries({ queryKey: ['blocks', user?.id] });
    },
  });
}

/** Unblock a user. */
export function useUnblockUser() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockedUserId }: { blockedUserId: string }) => {
      if (!user) throw new Error('Not authenticated');
      // Cast: blocks table not yet in generated types
      const { error } = await (supabase as any)
        .from('blocks')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', blockedUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      track('unblock_user');
      queryClient.invalidateQueries({ queryKey: ['blocks', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['blockedProfiles', user?.id] });
    },
  });
}

/** Combined report + block action (used from discover and chat). */
export function useReportAndBlock() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      reason = 'inappropriate' as ReportReason,
      details,
    }: {
      targetUserId: string;
      reason?: ReportReason;
      details?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Report
      await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: targetUserId,
        reason,
        details: details ?? null,
      });

      // Block (upsert to handle duplicates). Cast: blocks table not yet in generated types.
      const { error: blockError } = await (supabase as any).from('blocks').upsert(
        { user_id: user.id, blocked_user_id: targetUserId },
        { onConflict: 'user_id,blocked_user_id' },
      );
      if (blockError) throw blockError;
    },
    onSuccess: () => {
      track('report_submitted');
      track('block_user');
      queryClient.invalidateQueries({ queryKey: ['blocks', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });
}
