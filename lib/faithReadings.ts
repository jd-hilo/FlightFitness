import readings from '@/assets/data/faithReadings.json';

export type FaithReading = {
  id: string;
  title: string;
  reference: string;
  apiSlug: string;
  passage: string;
  reflection: string;
  studyPrompt: string;
};

const list = readings as FaithReading[];

function hashDateKey(utcYmd: string): number {
  let h = 0;
  for (let i = 0; i < utcYmd.length; i++) {
    h = (h << 5) - h + utcYmd.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Rotating study by UTC date (shared “today” for all users, like daily verse). */
export function getDailyFaithReading(date = new Date()): FaithReading {
  const key = date.toISOString().slice(0, 10);
  const idx = hashDateKey(key) % list.length;
  return list[idx]!;
}
