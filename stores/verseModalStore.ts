import { create } from 'zustand';

import type { VerseEntry } from '@/lib/verses';

type State = {
  visible: boolean;
  verse: VerseEntry | null;
  reflection: string | null;
  show: (verse: VerseEntry, reflection?: string) => void;
  hide: () => void;
};

export const useVerseModalStore = create<State>((set) => ({
  visible: false,
  verse: null,
  reflection: null,
  show: (verse, reflection) =>
    set({ visible: true, verse, reflection: reflection ?? null }),
  hide: () => set({ visible: false, verse: null, reflection: null }),
}));
