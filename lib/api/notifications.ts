import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/authStore';

export function useNotificationPreferences() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && (error as any).code !== 'PGRST116') throw error;
      return data ?? null;
    },
    enabled: !!user,
  });
}

export function useUpsertNotificationPreferences() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (prefs: { match_notifications?: boolean; message_notifications?: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...prefs,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}

