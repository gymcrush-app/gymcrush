import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP } from '@/theme';

interface AppState {
  isVisible: boolean;
  setVisible: (isVisible: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isVisible: true,

      setVisible: (isVisible) => set({ isVisible }),
    }),
    {
      name: APP.STORAGE_KEYS.APP,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isVisible: state.isVisible,
      }),
    }
  )
);
