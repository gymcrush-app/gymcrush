/**
 * Gym Gems API — Most-engaged profiles within radius.
 * useGymGems calls get_gym_gems RPC and returns ProfileWithScore[].
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { milesToKm } from '@/lib/utils/locale';
import type { ProfileWithScore, Profile, DiscoveryPreferences } from '@/types';

const DEFAULT_GYM_GEMS_MILES = 30;

function parseGymGemsRow(row: {
  profile: unknown;
  engagement_score: number;
  likes_received: number;
  comment_likes_received: number;
  gems_received: number;
}): ProfileWithScore {
  const profile = row.profile as Profile;
  return {
    ...profile,
    engagement_score: Number(row.engagement_score),
    likes_received: Number(row.likes_received),
    comment_likes_received: Number(row.comment_likes_received),
    gems_received: Number(row.gems_received),
  };
}

export const DEFAULT_GYM_GEMS_DISTANCE_KM = Math.round(milesToKm(DEFAULT_GYM_GEMS_MILES));

export interface GymGemsFilters {
  minAge?: number | null;
  maxAge?: number | null;
  genders?: string[] | null;
}

/**
 * Reusable gym-gems fetcher — used by useGymGems and the tabs-layout prefetcher.
 */
export async function fetchGymGems(
  maxDistanceKm: number,
  filters?: GymGemsFilters,
): Promise<ProfileWithScore[]> {
  const t0 = performance.now();
  if (__DEV__) console.log(`[fetchGymGems] START rpc get_gym_gems km=${maxDistanceKm}`);
  const { data, error } = await supabase.rpc('get_gym_gems', {
    p_max_distance_km: maxDistanceKm,
    p_min_age:
      typeof filters?.minAge === 'number' && !isNaN(filters.minAge) ? filters.minAge : null,
    p_max_age:
      typeof filters?.maxAge === 'number' && !isNaN(filters.maxAge) ? filters.maxAge : null,
    p_genders:
      Array.isArray(filters?.genders) && filters!.genders!.length > 0 ? filters!.genders : null,
  });
  const ms = Math.round(performance.now() - t0);
  if (error) {
    if (__DEV__) console.log(`[fetchGymGems] ERROR after ${ms}ms:`, error.message);
    throw error;
  }
  if (__DEV__) console.log(`[fetchGymGems] OK after ${ms}ms rows=${data?.length ?? 0}`);
  if (!Array.isArray(data) || data.length === 0) return [];
  return data.map((row) => parseGymGemsRow(row as Parameters<typeof parseGymGemsRow>[0]));
}

export function useGymGems(maxDistanceMiles?: number, filters?: GymGemsFilters) {
  const user = useAuthStore((s) => s.user);
  const maxDistanceKm = maxDistanceMiles != null
    ? Math.round(milesToKm(maxDistanceMiles))
    : DEFAULT_GYM_GEMS_DISTANCE_KM;

  return useQuery({
    queryKey: ['gymGems', user?.id, maxDistanceKm, filters?.minAge ?? null, filters?.maxAge ?? null, filters?.genders ?? null],
    queryFn: () => fetchGymGems(maxDistanceKm, filters),
    enabled: !!user,
  });
}
