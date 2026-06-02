import type { BiblePassage } from '@/lib/bibleApi';
import { fetchVersePassageContext } from '@/lib/versePassage';
import type { VerseEntry } from '@/lib/verses';

const cache = new Map<string, BiblePassage>();
const inFlight = new Map<string, Promise<BiblePassage | null>>();

function cacheKey(verse: VerseEntry) {
  return verse.reference.trim().toLowerCase();
}

export function getCachedVersePassage(verse: VerseEntry): BiblePassage | null {
  return cache.get(cacheKey(verse)) ?? null;
}

export async function loadVersePassage(
  verse: VerseEntry,
  options?: { force?: boolean }
): Promise<BiblePassage | null> {
  const key = cacheKey(verse);
  if (!options?.force) {
    const hit = cache.get(key);
    if (hit) return hit;
  }

  if (options?.force) inFlight.delete(key);

  const pending = inFlight.get(key);
  if (pending && !options?.force) return pending;

  const task = fetchVersePassageContext(verse).then((res) => {
    inFlight.delete(key);
    if (res) cache.set(key, res);
    return res;
  });

  inFlight.set(key, task);
  return task;
}

/** Warm passage text before rest timer or Faith study needs it. */
export function prefetchVersePassage(verse: VerseEntry): void {
  if (cache.has(cacheKey(verse))) return;
  void loadVersePassage(verse);
}
