/**
 * Profiles API — TanStack Query hooks for profile operations.
 * useProfile, useUpdateProfile, useDiscoverProfiles, useNearbyProfiles, useProfileById, useUpdateDiscoveryPreferences.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filterBadWords } from '@/lib/utils/filterBadWords';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { PROFILE_COLUMNS } from '@/constants';
import type { Profile, DiscoveryPreferences } from '@/types';

/** Profile shape returned by the discover_profiles RPC. */
export type DiscoverProfile = Profile & { distance_km: number | null };

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as unknown as Profile;
}

export function useProfile() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useDiscoverProfiles(
  preferences?: DiscoveryPreferences,
  options?: { enabled?: boolean }
) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['profiles', 'discover', user?.id, preferences],
    queryFn: async (): Promise<DiscoverProfile[]> => {
      try {
        if (!user) return [];

        const { data, error } = await supabase.rpc('discover_profiles', {
          p_min_age:
            typeof preferences?.minAge === 'number' && !isNaN(preferences.minAge)
              ? preferences.minAge
              : null,
          p_max_age:
            typeof preferences?.maxAge === 'number' && !isNaN(preferences.maxAge)
              ? preferences.maxAge
              : null,
          p_genders:
            preferences?.genders && Array.isArray(preferences.genders) && preferences.genders.length > 0
              ? preferences.genders
              : null,
          p_home_gym_id: null,
          p_skip_distance: false,
        });
        if (error) throw error;
        return (data ?? []) as unknown as DiscoverProfile[];
      } catch (error) {
        if (__DEV__) {
          console.error('[useDiscoverProfiles] Error:', error);
        }
        return [];
      }
    },
    enabled: !!user && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export function useUpdateProfile() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      const filteredUpdates = { ...updates };
      if (typeof filteredUpdates.display_name === 'string') {
        filteredUpdates.display_name = filterBadWords(filteredUpdates.display_name);
      }
      if (typeof filteredUpdates.bio === 'string') {
        filteredUpdates.bio = filterBadWords(filteredUpdates.bio);
      }
      const { data, error } = await supabase
        .from('profiles')
        .update(filteredUpdates)
        .eq('id', user.id)
        .select(PROFILE_COLUMNS)
        .single();
      if (error) throw error;
      return data as unknown as Profile;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['profile', user?.id] });
      const previousProfile = queryClient.getQueryData<Profile | null>(['profile', user?.id]);
      if (user) {
        queryClient.setQueryData<Profile>(['profile', user.id], {
          ...(previousProfile ?? ({} as Profile)),
          ...updates,
        });
      }
      return { previousProfile };
    },
    onError: (err, updates, context) => {
      if (context?.previousProfile != null && user) {
        queryClient.setQueryData(['profile', user.id], context.previousProfile);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

export function useNearbyProfiles(
  gymId: string,
  preferences?: DiscoveryPreferences,
  options?: { enabled?: boolean }
) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['profiles', 'nearby', gymId, preferences],
    queryFn: async (): Promise<DiscoverProfile[]> => {
      try {
        if (!gymId) return [];

        const { data, error } = await supabase.rpc('discover_profiles', {
          p_min_age:
            typeof preferences?.minAge === 'number' && !isNaN(preferences.minAge)
              ? preferences.minAge
              : null,
          p_max_age:
            typeof preferences?.maxAge === 'number' && !isNaN(preferences.maxAge)
              ? preferences.maxAge
              : null,
          p_genders:
            preferences?.genders && Array.isArray(preferences.genders) && preferences.genders.length > 0
              ? preferences.genders
              : null,
          p_home_gym_id: gymId,
          p_skip_distance: true,
        });

        if (error) {
          console.error('[useNearbyProfiles] RPC error:', error);
          throw error;
        }

        return (data ?? []) as unknown as DiscoverProfile[];
      } catch (error) {
        if (__DEV__) {
          console.error('[useNearbyProfiles] Error in queryFn:', error);
        }
        return [];
      }
    },
    enabled: !!gymId && !!user && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

/** Shared fetcher for prefetch and useProfileById. Uses RPC to bypass expensive RLS geo policy. */
export async function fetchProfileById(profileId: string): Promise<Profile> {
  const { data, error } = await supabase
    .rpc('get_profile_by_id', { p_profile_id: profileId })
    .single();
  if (error) {
    throw error;
  }
  return data as Profile;
}

export function useProfileById(profileId: string) {
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => fetchProfileById(profileId),
    enabled: !!profileId,
    staleTime: 30_000, // prevent immediate refetch after prefetch
  });
}

export function useUpdateDiscoveryPreferences() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Record<string, any>>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get current profile to merge with existing discovery_preferences
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('discovery_preferences')
        .eq('id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Merge updates with existing discovery_preferences
      const currentPrefs = (currentProfile?.discovery_preferences as Record<string, any>) || {};
      const updatedPrefs = { ...currentPrefs, ...updates };
      
      // Update the profile with merged discovery_preferences
      const { data, error } = await supabase
        .from('profiles')
        .update({ discovery_preferences: updatedPrefs })
        .eq('id', user.id)
        .select(PROFILE_COLUMNS)
        .single();

      if (error) throw error;
      return data as unknown as Profile;
    },
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['profile', user?.id] });
      
      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<Profile | null>(['profile', user?.id]);
      
      // Optimistically update the cache
      if (previousProfile && user) {
        const currentPrefs = (previousProfile.discovery_preferences as Record<string, any>) || {};
        const updatedPrefs = { ...currentPrefs, ...updates };
        queryClient.setQueryData<Profile>(['profile', user.id], {
          ...previousProfile,
          discovery_preferences: updatedPrefs,
        });
      }
      
      return { previousProfile };
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previousProfile && user) {
        queryClient.setQueryData(['profile', user.id], context.previousProfile);
      }
    },
    onSuccess: (data) => {
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}
