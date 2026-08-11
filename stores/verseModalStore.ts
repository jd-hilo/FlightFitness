import { create } from 'zustand';

import type { VerseEntry } from '@/lib/verses';

type ShowOptions = { confetti?: boolean };

type State = {
  visible: boolean;
  verse: VerseEntry | null;
  reflection: string | null;
  confetti: boolean;
  show: (verse: VerseEntry, reflection?: string, options?: ShowOptions) => void;
  hide: () => void;
};

export const useVerseModalStore = create<State>((set) => ({
  visible: false,
  verse: null,
  reflection: null,
  confetti: false,
  show: (verse, reflection, options) =>
    set({
      visible: true,
      verse,
      reflection: reflection ?? null,
      confetti: options?.confetti ?? false,
    }),
  hide: () => set({ visible: false, verse: null, reflection: null, confetti: false }),
}));
