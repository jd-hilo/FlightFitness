import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type DevotionalNotificationState = {
  /** The Faith-page prompt has been answered. */
  asked: boolean;
  /** They chose to receive the morning devotional. */
  wantsDaily: boolean;
  accept: () => void;
  decline: () => void;
};

export const useDevotionalNotificationStore = create<DevotionalNotificationState>()(
  persist(
    (set) => ({
      asked: false,
      wantsDaily: false,
      accept: () => set({ asked: true, wantsDaily: true }),
      decline: () => set({ asked: true, wantsDaily: false }),
    }),
    {
      name: 'flight-devotional-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ asked: state.asked, wantsDaily: state.wantsDaily }),
    }
  )
);
