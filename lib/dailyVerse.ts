import type { DailyContent } from '@/lib/api/dailyContent';
import { getDailyVerse, type VerseEntry } from '@/lib/verses';

/** Today's verse: Supabase daily-content when loaded, else same UTC-day pick as the server. */
export function resolveDailyVerse(content: DailyContent | null | undefined): VerseEntry {
  return content?.verse ?? getDailyVerse();
}
