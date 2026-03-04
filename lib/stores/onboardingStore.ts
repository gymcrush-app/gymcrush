import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingData } from '@/types/onboarding';
import { INITIAL_ONBOARDING_DATA } from '@/types/onboarding';
import { APP } from '@/theme';

interface OnboardingStore {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  updateData: (updates: Partial<OnboardingData>) => void;
  clearData: () => void;
}

// Serialized version of OnboardingData for storage (Date as string)
interface SerializedOnboardingData extends Omit<OnboardingData, 'dateOfBirth'> {
  dateOfBirth: string | null;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      data: INITIAL_ONBOARDING_DATA,

      setData: (data) => set({ data }),

      updateData: (updates) =>
        set((state) => ({
          data: { ...state.data, ...updates },
        })),

      clearData: () => set({ data: INITIAL_ONBOARDING_DATA }),
    }),
    {
      name: APP.STORAGE_KEYS.ONBOARDING,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // Convert Date to ISO string for storage
        return {
          data: {
            ...state.data,
            dateOfBirth: state.data.dateOfBirth
              ? state.data.dateOfBirth.toISOString()
              : null,
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        // Convert ISO string back to Date on rehydrate
        if (state?.data?.dateOfBirth && typeof state.data.dateOfBirth === 'string') {
          state.data.dateOfBirth = new Date(state.data.dateOfBirth);
        }
      },
    }
  )
);
