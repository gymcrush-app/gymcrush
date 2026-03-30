/**
 * Gym Gems API — Most-engaged profiles within radius.
 * useGymGems calls get_gym_gems RPC and returns ProfileWithScore[].
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { milesToKm } from '@/lib/utils/locale';
import type { ProfileWithScore, Profile } from '@/types';

const DEFAULT_GYM_GEMS_MILES = 30;

function parseGymGemsRow(row: {
  profile: unknown;
  engagement_score: number;
  likes_received: number;
  crush_received: number;
  matches_count: number;
  first_messages_received: number;
}): ProfileWithScore {
  const profile = row.profile as Profile;
  return {
    ...profile,
    engagement_score: Number(row.engagement_score),
    likes_received: Number(row.likes_received),
    crush_received: Number(row.crush_received),
    matches_count: Number(row.matches_count),
    first_messages_received: Number(row.first_messages_received),
  };
}

export function useGymGems(maxDistanceMiles?: number) {
  const user = useAuthStore((s) => s.user);
  const maxDistanceKm = maxDistanceMiles != null
    ? Math.round(milesToKm(maxDistanceMiles))
    : Math.round(milesToKm(DEFAULT_GYM_GEMS_MILES));

  return useQuery({
    queryKey: ['gymGems', user?.id, maxDistanceKm],
    queryFn: async (): Promise<ProfileWithScore[]> => {
      if (!user) return [];
      const t0 = performance.now();
      console.log(`[useGymGems] START rpc get_gym_gems km=${maxDistanceKm}`);
      const { data, error } = await supabase.rpc('get_gym_gems', {
        p_max_distance_km: maxDistanceKm,
      });
      const ms = Math.round(performance.now() - t0);
      if (error) {
        console.log(`[useGymGems] ERROR after ${ms}ms:`, error.message);
        throw error;
      }
      console.log(`[useGymGems] OK after ${ms}ms rows=${data?.length ?? 0}`);
      if (!Array.isArray(data) || data.length === 0) return [];
      return data.map((row) => parseGymGemsRow(row as Parameters<typeof parseGymGemsRow>[0]));
    },
    enabled: !!user,
  });
}
