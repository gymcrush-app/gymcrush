/**
 * Gem tokens API — daily gem to give, give_gym_gem RPC, useDailyGem hook.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/lib/api/profiles';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';

/** Start of today in the user's local timezone as ISO string (for RPC comparison). */
export function getStartOfTodayLocal(): string {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return start.toISOString();
}

export interface DailyGemStatus {
  hasGemToday: boolean;
  lastGemGivenAt: string | null;
}

/** Derive daily gem state from current user profile. Resets at midnight local. */
export function useDailyGem(): { hasGemToday: boolean; lastGemGivenAt: string | null; isLoading: boolean } {
  const { data: profile, isLoading } = useProfile();
  const lastGemGivenAt = profile?.last_gem_given_at ?? null;
  const startOfToday = getStartOfTodayLocal();
  const hasGemToday =
    lastGemGivenAt == null || new Date(lastGemGivenAt).toISOString() < startOfToday;

  return {
    hasGemToday,
    lastGemGivenAt: lastGemGivenAt ?? null,
    isLoading,
  };
}

export interface GiveGymGemResult {
  ok: boolean;
  error?: string;
  sender_display_name?: string;
}

export function useGiveGymGem() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toUserId: string): Promise<GiveGymGemResult> => {
      if (!user) throw new Error('Not authenticated');
      const pGiverTodayStart = getStartOfTodayLocal();
      const { data, error } = await supabase.rpc('give_gym_gem', {
        p_to_user_id: toUserId,
        p_giver_today_start: pGiverTodayStart,
      });
      if (error) {
        const msg = error.message || 'Failed to give gem';
        return { ok: false, error: msg };
      }
      const result = data as GiveGymGemResult | null;
      if (result?.ok === true) return result;
      return { ok: false, error: (result as { error?: string })?.error ?? 'Unknown error' };
    },
    onSuccess: (result, toUserId) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['profile', toUserId] });
        queryClient.invalidateQueries({ queryKey: ['gymGems'] });
        queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      }
    },
  });
}
