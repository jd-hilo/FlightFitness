import { getAllVerses, type VerseEntry } from '@/lib/verses';

export const WORKOUT_VERSE_CYCLE_SIZE = 15;

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) - h + key.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Deterministic shuffle so the same workout session always gets the same order. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Build a fixed list of verses for one workout: today's word first, then 14 others.
 * Repeats after 15 rests (or sooner if the library is smaller).
 */
export function buildWorkoutVerseCycle(
  sessionKey: string,
  dailyVerse: VerseEntry,
  size = WORKOUT_VERSE_CYCLE_SIZE
): VerseEntry[] {
  const all = getAllVerses();
  const others = all.filter((v) => v.id !== dailyVerse.id);
  const seed = hashKey(sessionKey);
  const shuffled = seededShuffle(others, seed);
  const extraCount = Math.max(0, size - 1);
  const extras = shuffled.slice(0, extraCount);
  if (extras.length < extraCount) {
    const pad = seededShuffle(all, seed + 1).filter(
      (v) => v.id !== dailyVerse.id && !extras.some((e) => e.id === v.id)
    );
    while (extras.length < extraCount && pad.length > 0) {
      extras.push(pad.shift()!);
    }
  }
  return [dailyVerse, ...extras];
}

export function verseForRestIndex(cycle: VerseEntry[], restIndex: number): VerseEntry {
  if (cycle.length === 0) return getAllVerses()[0]!;
  const idx = ((restIndex % cycle.length) + cycle.length) % cycle.length;
  return cycle[idx]!;
}
