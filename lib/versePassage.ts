import { fetchPassage, type BiblePassage, type BibleVerse } from '@/lib/bibleApi';
import type { VerseEntry } from '@/lib/verses';

export type ParsedReference = {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
};

export function parseVerseReference(reference: string): ParsedReference | null {
  const m = reference.trim().match(/^(.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/);
  if (!m) return null;
  const startVerse = parseInt(m[3]!, 10);
  const endVerse = m[4] ? parseInt(m[4], 10) : startVerse;
  if (!Number.isFinite(startVerse) || !Number.isFinite(endVerse)) return null;
  return {
    book: m[1]!.trim(),
    chapter: parseInt(m[2]!, 10),
    startVerse,
    endVerse: Math.max(startVerse, endVerse),
  };
}

/** bible-api.com slug with surrounding verses for rest-time reading. */
export function buildPassageSlug(reference: string, contextRadius = 4): string | null {
  const parsed = parseVerseReference(reference);
  if (!parsed) return null;
  const bookSlug = parsed.book.toLowerCase().replace(/\s+/g, '+');
  const lo = Math.max(1, parsed.startVerse - contextRadius);
  const hi = parsed.endVerse + contextRadius;
  if (lo === hi) return `${bookSlug}+${parsed.chapter}:${lo}`;
  return `${bookSlug}+${parsed.chapter}:${lo}-${hi}`;
}

export function isVerseHighlighted(
  verse: BibleVerse,
  featured: ParsedReference | null
): boolean {
  if (!featured) return false;
  return (
    verse.chapter === featured.chapter &&
    verse.verse >= featured.startVerse &&
    verse.verse <= featured.endVerse
  );
}

export async function fetchVersePassageContext(
  verse: VerseEntry
): Promise<BiblePassage | null> {
  const slug = buildPassageSlug(verse.reference);
  if (!slug) return null;
  return fetchPassage(slug, { translation: 'web' });
}

export function truncateVersePreview(text: string, maxLen = 110): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxLen * 0.55 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trim()}…`;
}
