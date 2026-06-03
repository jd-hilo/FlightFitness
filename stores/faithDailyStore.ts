import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { formatYmdLocal } from '@/lib/weekUtils';

function todayKey() {
  return formatYmdLocal(new Date());
}

type DayFaith = {
  verseRead: boolean;
  studyRead: boolean;
  journalDone: boolean;
  journalLine: string;
};

function bumpFaithStreak(
  lastIncrement: string | null,
  streak: number,
  today: string
): { faithStreak: number; lastFaithStreakDate: string | null } {
  if (lastIncrement === today) {
    return { faithStreak: streak, lastFaithStreakDate: lastIncrement };
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = formatYmdLocal(yesterday);
  let next = streak;
  if (lastIncrement == null) {
    next = 1;
  } else if (lastIncrement === yKey) {
    next = streak + 1;
  } else {
    next = 1;
  }
  return { faithStreak: next, lastFaithStreakDate: today };
}

/** Bump the streak only when a reflection is newly completed for today. */
function streakUpdateForReflection(
  get: () => FaithDailyState,
  dateKey: string,
  justCompleted: boolean
): { faithStreak: number; lastFaithStreakDate: string | null } {
  const current = {
    faithStreak: get().faithStreak,
    lastFaithStreakDate: get().lastFaithStreakDate,
  };
  const today = todayKey();
  if (!justCompleted || dateKey !== today) return current;
  if (get().lastFaithStreakDate === today) return current;
  return bumpFaithStreak(get().lastFaithStreakDate, get().faithStreak, today);
}

type FaithDailyState = {
  byDay: Record<string, DayFaith>;
  faithStreak: number;
  lastFaithStreakDate: string | null;
  toggleVerseRead: (dateKey: string) => void;
  toggleStudyRead: (dateKey: string) => void;
  toggleJournalDone: (dateKey: string) => void;
  setJournalLine: (dateKey: string, line: string) => void;
  /** Call when user taps Done — checks off only if there is non-empty text. */
  markJournalReflectionComplete: (dateKey: string) => void;
  reset: () => void;
};

const emptyDay = (): DayFaith => ({
  verseRead: false,
  studyRead: false,
  journalDone: false,
  journalLine: '',
});

export const useFaithDailyStore = create<FaithDailyState>()(
  persist(
    (set, get) => ({
      byDay: {},
      faithStreak: 0,
      lastFaithStreakDate: null,
      toggleVerseRead: (dateKey) => {
        const day = { ...(get().byDay[dateKey] ?? emptyDay()) };
        day.verseRead = !day.verseRead;
        set({ byDay: { ...get().byDay, [dateKey]: day } });
      },
      toggleStudyRead: (dateKey) => {
        const day = { ...(get().byDay[dateKey] ?? emptyDay()) };
        day.studyRead = !day.studyRead;
        set({ byDay: { ...get().byDay, [dateKey]: day } });
      },
      toggleJournalDone: (dateKey) => {
        const day = { ...(get().byDay[dateKey] ?? emptyDay()) };
        const wasDone = day.journalDone;
        if (day.journalDone) {
          day.journalDone = false;
          day.journalLine = '';
        } else if (day.journalLine.trim().length > 0) {
          day.journalDone = true;
        }
        const justCompleted = !wasDone && day.journalDone;
        set({
          byDay: { ...get().byDay, [dateKey]: day },
          ...streakUpdateForReflection(get, dateKey, justCompleted),
        });
      },
      setJournalLine: (dateKey, line) => {
        const day = { ...(get().byDay[dateKey] ?? emptyDay()) };
        day.journalLine = line;
        if (line.trim().length === 0) day.journalDone = false;
        set({ byDay: { ...get().byDay, [dateKey]: day } });
      },
      markJournalReflectionComplete: (dateKey) => {
        const day = { ...(get().byDay[dateKey] ?? emptyDay()) };
        if (day.journalLine.trim().length === 0) return;
        const wasDone = day.journalDone;
        day.journalDone = true;
        set({
          byDay: { ...get().byDay, [dateKey]: day },
          ...streakUpdateForReflection(get, dateKey, !wasDone),
        });
      },
      reset: () =>
        set({ byDay: {}, faithStreak: 0, lastFaithStreakDate: null }),
    }),
    {
      name: 'flight-faith-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
