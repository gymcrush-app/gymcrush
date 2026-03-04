import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP } from '@/theme';

interface AppState {
  isVisible: boolean;
  lastCrushSignalTime: number | null;
  hasCrushAvailable: boolean;
  setVisible: (isVisible: boolean) => void;
  recordCrushSignal: () => void;
  checkCrushAvailability: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isVisible: true,
      lastCrushSignalTime: null,
      hasCrushAvailable: true,

      setVisible: (isVisible) => set({ isVisible }),

      recordCrushSignal: () => {
        const now = Date.now();
        set({ 
          lastCrushSignalTime: now,
          hasCrushAvailable: false,
        });
      },

      checkCrushAvailability: () => {
        const { lastCrushSignalTime } = get();
        if (!lastCrushSignalTime) {
          set({ hasCrushAvailable: true });
          return true;
        }

        const timeSinceLastCrush = Date.now() - lastCrushSignalTime;
        const isAvailable = timeSinceLastCrush >= APP.CRUSH_COOLDOWN_MS;
        
        set({ hasCrushAvailable: isAvailable });
        return isAvailable;
      },
    }),
    {
      name: APP.STORAGE_KEYS.APP,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isVisible: state.isVisible,
        lastCrushSignalTime: state.lastCrushSignalTime,
      }),
    }
  )
);
