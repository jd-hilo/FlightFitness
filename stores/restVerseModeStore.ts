import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type RestVerseMode = 'daily' | 'cycle';

type RestVerseModeState = {
  mode: RestVerseMode;
  setMode: (mode: RestVerseMode) => void;
};

export const useRestVerseModeStore = create<RestVerseModeState>()(
  persist(
    (set) => ({
      mode: 'cycle',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'flight-rest-verse-mode',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
