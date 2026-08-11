import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_REST_TIMER_SOUND_ID,
  type RestTimerSoundId,
} from '@/lib/restTimerSounds';

type RestTimerSoundState = {
  soundId: RestTimerSoundId;
  setSoundId: (id: RestTimerSoundId) => void;
};

export const useRestTimerSoundStore = create<RestTimerSoundState>()(
  persist(
    (set) => ({
      soundId: DEFAULT_REST_TIMER_SOUND_ID,
      setSoundId: (soundId) => set({ soundId }),
    }),
    {
      name: 'flight-rest-timer-sound',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
