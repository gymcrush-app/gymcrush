/**
 * Profiles API — TanStack Query hooks for profile operations.
 * useProfile, useUpdateProfile, useDiscoverProfiles, useNearbyProfiles, useProfileById, useUpdateDiscoveryPreferences.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import type { Profile, DiscoveryPreferences } from '@/types';

export function useProfile() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useDiscoverProfiles(preferences?: DiscoveryPreferences) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['profiles', 'discover', user?.id, preferences],
    queryFn: async () => {
      try {
        if (!user) return [];

        let query = supabase
          .from('profiles')
          .select('*')
          .eq('is_visible', true)
          .neq('id', user.id);

        if (
          preferences?.minAge !== undefined &&
          typeof preferences.minAge === 'number' &&
          !isNaN(preferences.minAge)
        ) {
          query = query.gte('age', preferences.minAge);
        }

        if (
          preferences?.maxAge !== undefined &&
          typeof preferences.maxAge === 'number' &&
          !isNaN(preferences.maxAge)
        ) {
          query = query.lte('age', preferences.maxAge);
        }

        if (preferences?.genders && Array.isArray(preferences.genders) && preferences.genders.length > 0) {
          query = query.in('gender', preferences.genders);
        }

        const { data, error } = await query;
        if (error) throw error;
        const result = data || [];
        return result;
      } catch (error) {
        if (__DEV__) {
          console.error('[useDiscoverProfiles] Error:', error);
        }
        return [];
      }
    },
    enabled: !!user,
    retry: 1,
  });
}

export function useUpdateProfile() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

export function useNearbyProfiles(gymId: string, preferences?: DiscoveryPreferences) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['profiles', 'nearby', gymId, preferences],
    queryFn: async () => {
      try {
        if (!gymId) {
          return [];
        }

        let query = supabase
          .from('profiles')
          .select('*')
          .eq('home_gym_id', gymId)
          .eq('is_visible', true)
          .neq('id', user?.id || '');

        if (preferences?.minAge !== undefined && typeof preferences.minAge === 'number' && !isNaN(preferences.minAge)) {
          query = query.gte('age', preferences.minAge);
        }

        if (preferences?.maxAge !== undefined && typeof preferences.maxAge === 'number' && !isNaN(preferences.maxAge)) {
          query = query.lte('age', preferences.maxAge);
        }

        if (preferences?.genders && Array.isArray(preferences.genders) && preferences.genders.length > 0) {
          query = query.in('gender', preferences.genders);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('[useNearbyProfiles] Query error:', error);
          console.error('[useNearbyProfiles] Error details:', JSON.stringify(error));
          throw error;
        }

        let filtered = data || [];
        if (preferences?.genders && preferences.genders.length > 0) {
          // Already filtered by database query above
        }
        
        return filtered;
      } catch (error) {
        if (__DEV__) {
          console.error('[useNearbyProfiles] Error in queryFn:', error);
        }
        return [];
      }
    },
    enabled: !!gymId && !!user,
    retry: 1,
  });
}

/** Shared fetcher for prefetch and useProfileById. */
export async function fetchProfileById(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  if (error) throw error;
  return data;
}

export function useProfileById(profileId: string) {
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => fetchProfileById(profileId),
    enabled: !!profileId,
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
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
