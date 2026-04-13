import versesData from '@/assets/data/verses.json';
import type { VerseTag } from '@/types/plan';

export type VerseEntry = {
  id: string;
  text: string;
  reference: string;
  tags: VerseTag[];
};

const verses = versesData as VerseEntry[];

function hashDateKey(utcYmd: string): number {
  let h = 0;
  for (let i = 0; i < utcYmd.length; i++) {
    h = (h << 5) - h + utcYmd.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Global daily verse: same for all users per UTC calendar day. */
export function getDailyVerse(date = new Date()): VerseEntry {
  const key = date.toISOString().slice(0, 10);
  const idx = hashDateKey(key) % verses.length;
  return verses[idx]!;
}

const sessionRandom: Record<string, VerseEntry> = {};

/** Random verse from tag pool; stable per session key to avoid flicker. */
export function getTriggerVerse(tag: VerseTag, sessionKey: string): VerseEntry {
  const cacheKey = `${tag}:${sessionKey}`;
  if (sessionRandom[cacheKey]) return sessionRandom[cacheKey]!;
  const pool = verses.filter((v) => v.tags.includes(tag));
  const list = pool.length ? pool : verses;
  const picked = list[Math.floor(Math.random() * list.length)]!;
  sessionRandom[cacheKey] = picked;
  return picked;
}

export function getAllVerses(): VerseEntry[] {
  return verses;
}
