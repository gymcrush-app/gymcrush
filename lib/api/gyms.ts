/**
 * Gyms API — TanStack Query hooks for gym search and retrieval.
 * useSearchGyms, useGymById, useGymsByIds. Debouncing is a call-site concern.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Gym } from '@/types';

export function useSearchGyms(query: string) {
  return useQuery({
    queryKey: ['gyms', 'search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(20);
      
      if (error) throw error;
      return (data || []) as Gym[];
    },
    enabled: query.length >= 2,
  });
}

export function useGymById(gymId: string) {
  return useQuery({
    queryKey: ['gym', gymId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single();
      
      if (error) throw error;
      return data as Gym;
    },
    enabled: !!gymId,
    staleTime: 1000 * 60 * 60, // 1 hour — gym data rarely changes
  });
}

/**
 * Batch fetch gyms by their IDs
 * @param gymIds Array of gym IDs to fetch
 * @returns Query hook that returns a map of gymId -> Gym
 */
export function useGymsByIds(gymIds: string[]) {
  return useQuery({
    queryKey: ['gyms', 'batch', gymIds.sort().join(',')],
    queryFn: async () => {
      if (gymIds.length === 0) return new Map<string, Gym>();
      
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .in('id', gymIds);
      
      if (error) throw error;
      
      // Return as a Map for O(1) lookup
      const gymMap = new Map<string, Gym>();
      (data || []).forEach((gym) => {
        gymMap.set(gym.id, gym as Gym);
      });
      
      return gymMap;
    },
    enabled: gymIds.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour — gym data rarely changes
  });
}
