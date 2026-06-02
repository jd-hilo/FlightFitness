import { truncateVersePreview } from '@/lib/versePassage';

const HERO_VERSE_MAX = 180;

/** Hero rest screen: full verse when short, otherwise a clean truncation. */
export function restVerseHeroText(raw: string): {
  text: string;
  truncated: boolean;
} {
  const cleaned = raw.trim().replace(/^["“]|["”]$/g, '');
  if (cleaned.length <= HERO_VERSE_MAX) {
    return { text: cleaned, truncated: false };
  }
  return {
    text: truncateVersePreview(cleaned, HERO_VERSE_MAX),
    truncated: true,
  };
}

/** e.g. "Next: Bench · Set 3" → "NEXT · BENCH · SET 3" */
export function formatRestNextLabel(nextLabel: string): string {
  const stripped = nextLabel.replace(/^next:\s*/i, '').trim();
  if (!stripped) return '';
  return stripped.replace(/\s*·\s*/g, ' · ').toUpperCase();
}
