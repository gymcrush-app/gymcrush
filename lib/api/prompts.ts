/**
 * Prompts API — TanStack Query hooks for prompt sections, prompts, and profile prompt answers.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { filterBadWords } from '@/lib/utils/filterBadWords';
import type { PromptSectionWithPrompts, ProfilePromptWithDetails } from '@/types/onboarding';

/**
 * Fetch all prompt sections with their active prompts, ordered by display_order.
 */
export function usePromptSections() {
  return useQuery({
    queryKey: ['prompt-sections'],
    queryFn: async (): Promise<PromptSectionWithPrompts[]> => {
      const { data: sections, error: sectionsError } = await supabase
        .from('prompt_sections')
        .select('*')
        .order('display_order');

      if (sectionsError) throw sectionsError;

      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (promptsError) throw promptsError;

      return (sections ?? []).map((section) => ({
        id: section.id,
        name: section.name,
        subtitle: section.subtitle,
        display_order: section.display_order,
        prompts: (prompts ?? [])
          .filter((p) => p.section_id === section.id)
          .map((p) => ({
            id: p.id,
            prompt_text: p.prompt_text,
            display_order: p.display_order,
            is_active: p.is_active,
          })),
      }));
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/** Shared fetcher for prefetch and useProfilePrompts. */
export async function fetchProfilePrompts(profileId: string): Promise<ProfilePromptWithDetails[]> {
  const { data, error } = await supabase
    .from('profile_prompts')
    .select(`
      id,
      prompt_id,
      section_id,
      answer,
      engagement_count,
      prompts!inner(prompt_text),
      prompt_sections!inner(name, display_order)
    `)
    .eq('profile_id', profileId)
    .order('display_order', { referencedTable: 'prompt_sections' });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    prompt_id: row.prompt_id,
    section_id: row.section_id,
    answer: row.answer,
    engagement_count: row.engagement_count,
    prompt_text: row.prompts.prompt_text,
    section_name: row.prompt_sections.name,
    section_display_order: row.prompt_sections.display_order,
  }));
}

/**
 * Fetch a profile's prompt answers with prompt text and section info.
 */
export function useProfilePrompts(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profile-prompts', profileId],
    queryFn: () => fetchProfilePrompts(profileId!),
    enabled: !!profileId,
    staleTime: 30_000,
  });
}

/**
 * Upsert a profile prompt answer.
 */
export function useUpsertProfilePrompt() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      promptId: string;
      sectionId: string;
      answer: string;
      resetEngagement?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const filteredAnswer = filterBadWords(params.answer);

      const upsertData = {
        profile_id: user.id,
        prompt_id: params.promptId,
        section_id: params.sectionId,
        answer: filteredAnswer,
        updated_at: new Date().toISOString(),
        ...(params.resetEngagement ? { engagement_count: 0 } : {}),
      };

      const { data, error } = await supabase
        .from('profile_prompts')
        .upsert(upsertData, { onConflict: 'profile_id,section_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-prompts', user?.id] });
    },
  });
}

/**
 * Bulk insert profile prompts during onboarding.
 */
export async function insertProfilePrompts(
  profileId: string,
  answers: Array<{ promptId: string; sectionId: string; answer: string }>
) {
  const rows = answers.map((a) => ({
    profile_id: profileId,
    prompt_id: a.promptId,
    section_id: a.sectionId,
    answer: filterBadWords(a.answer),
  }));

  const { error } = await supabase
    .from('profile_prompts')
    .upsert(rows, { onConflict: 'profile_id,section_id' });

  if (error) throw error;
}

/**
 * Increment engagement_count on a profile prompt.
 */
export function useIncrementEngagement() {
  return useMutation({
    mutationFn: async (profilePromptId: string) => {
      const { error } = await (supabase.rpc as any)('increment_engagement_count', {
        p_profile_prompt_id: profilePromptId,
      });
      if (error) {
        if (__DEV__) {
          console.warn('[incrementEngagement] failed:', error);
        }
      }
    },
  });
}
