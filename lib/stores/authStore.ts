import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Database } from '@/types/database';
import { APP } from '@/theme';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isOnboarded: boolean;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setOnboarded: (isOnboarded: boolean) => void;
  clearSession: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      profile: null,
      isOnboarded: false,
      isLoading: true,

      setSession: (session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          get().initialize();
        } else {
          set({ profile: null, isOnboarded: false });
        }
      },

      setUser: (user) => set({ user }),

      setProfile: (profile) => {
        set({ 
          profile, 
          isOnboarded: profile?.is_onboarded ?? false 
        });
      },

      setOnboarded: (isOnboarded) => {
        set({ isOnboarded });
        if (get().profile) {
          set({ 
            profile: { ...get().profile!, is_onboarded: isOnboarded } 
          });
        }
      },

      clearSession: () => {
        set({ 
          session: null, 
          user: null, 
          profile: null, 
          isOnboarded: false 
        });
      },

      initialize: async () => {
        const { session } = get();
        if (!session?.user) {
          set({ isLoading: false });
          return;
        }

        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          }

          set({ 
            profile: profile ?? null,
            isOnboarded: profile?.is_onboarded ?? false,
            isLoading: false 
          });
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: APP.STORAGE_KEYS.AUTH,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);
