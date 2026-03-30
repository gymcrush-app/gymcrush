import { create } from 'zustand';

interface AppReadyState {
  isReady: boolean;
  setReady: () => void;
}

export const useAppReadyStore = create<AppReadyState>((set) => ({
  isReady: false,
  setReady: () =>
    set((state) => (state.isReady ? state : { isReady: true })),
}));
