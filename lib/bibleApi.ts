/**
 * Client for bible-api.com (JSON Bible API, WEB default — public domain).
 *
 * Docs: https://bible-api.com/
 * - User passages: GET /book+chapter:verse?translation=web
 * - Chapters: GET /data/{translation}/{BOOK_ID}/{chapter}
 * - Random: GET /data/{translation}/random[/{OT|NT|BOOK_IDS}]
 *
 * Fair use: rate-limited (~15 req / 30s per IP). Do not bulk-download whole Bibles.
 */

const BASE = 'https://bible-api.com';

export const DEFAULT_TRANSLATION = 'web';

/** Known translation ids from bible-api.com (subset; see site for full list). */
export const BIBLE_API_TRANSLATIONS = [
  'web',
  'kjv',
  'asv',
  'bbe',
  'darby',
  'dra',
  'ylt',
  'webbe',
  'oeb-us',
  'oeb-cw',
] as const;

export type BibleVerse = {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
};

export type BiblePassage = {
  text: string;
  reference: string;
  translationId: string;
  translationName: string;
  translationNote?: string;
  verses?: BibleVerse[];
};

/** @deprecated Prefer BiblePassage; kept for existing call sites. */
export type BibleFetchResult = {
  text: string;
  reference: string;
  translationName: string;
};

type UserApiJson = {
  reference?: string;
  text?: string;
  translation_id?: string;
  translation_name?: string;
  translation_note?: string;
  verses?: Array<{
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
};

type DataTranslationJson = {
  identifier: string;
  name: string;
  language?: string;
  language_code?: string;
  license?: string;
};

type ChapterApiJson = {
  translation: DataTranslationJson;
  verses: Array<{
    book_id: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
};

type RandomApiJson = {
  translation: DataTranslationJson;
  random_verse: {
    book_id: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
  };
};

function normalizeVerses(raw: UserApiJson['verses']): BibleVerse[] | undefined {
  if (!raw?.length) return undefined;
  return raw.map((v) => ({
    bookId: v.book_id,
    bookName: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text.trim(),
  }));
}

function mapUserApi(data: UserApiJson): BiblePassage | null {
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!text) return null;
  return {
    text,
    reference: data.reference ?? '',
    translationId: data.translation_id ?? DEFAULT_TRANSLATION,
    translationName: data.translation_name ?? 'World English Bible',
    translationNote: data.translation_note,
    verses: normalizeVerses(data.verses),
  };
}

function toSlug(query: string) {
  return query.trim().replace(/\s+/g, '+');
}

/**
 * User-input style passage: e.g. `"john 3:16"`, `"matt 5:3-5"`, `"psalm+23"` (slug).
 * @see https://bible-api.com/
 */
export async function fetchPassage(
  query: string,
  options?: { translation?: string }
): Promise<BiblePassage | null> {
  const slug = toSlug(query);
  if (!slug) return null;

  const tid = options?.translation?.trim().toLowerCase();
  const url = tid
    ? `${BASE}/${slug}?translation=${encodeURIComponent(tid)}`
    : `${BASE}/${slug}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as UserApiJson;
    return mapUserApi(data);
  } catch {
    return null;
  }
}

/** Same as fetchPassage with WEB translation forced (legacy shape). */
export async function fetchWebPassage(
  apiSlug: string
): Promise<BibleFetchResult | null> {
  const p = await fetchPassage(apiSlug, { translation: DEFAULT_TRANSLATION });
  if (!p) return null;
  return {
    text: p.text,
    reference: p.reference,
    translationName: p.translationName,
  };
}

/**
 * Full chapter via parameterized API: `/data/web/JHN/3`.
 * `bookId` is uppercase API id (e.g. GEN, PSA, JHN).
 */
export async function fetchChapter(
  bookId: string,
  chapter: number,
  translation: string = DEFAULT_TRANSLATION
): Promise<BiblePassage | null> {
  const bid = bookId.trim().toUpperCase();
  const tid = translation.trim().toLowerCase();
  if (!bid || chapter < 1) return null;

  const url = `${BASE}/data/${tid}/${bid}/${chapter}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as ChapterApiJson;
    const verses = data.verses ?? [];
    if (!verses.length) return null;

    const text = verses.map((v) => v.text.trim()).join('\n');
    const first = verses[0]!;
    const reference = `${first.book} ${first.chapter}`;
    return {
      text,
      reference,
      translationId: data.translation.identifier,
      translationName: data.translation.name,
      translationNote: data.translation.license,
      verses: verses.map((v) => ({
        bookId: v.book_id,
        bookName: v.book,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text.trim(),
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Random verse: `/data/web/random` or `/data/web/random/NT` or `/data/web/random/GEN,EXO`.
 */
export async function fetchRandomVerse(
  options?: { translation?: string; bookFilter?: string }
): Promise<BiblePassage | null> {
  const tid = (options?.translation ?? DEFAULT_TRANSLATION).trim().toLowerCase();
  const filter = options?.bookFilter?.trim();
  const path = filter ? `data/${tid}/random/${filter}` : `data/${tid}/random`;
  const url = `${BASE}/${path}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as RandomApiJson;
    const rv = data.random_verse;
    if (!rv?.text) return null;

    const text = rv.text.trim();
    const reference = `${rv.book} ${rv.chapter}:${rv.verse}`;
    return {
      text,
      reference,
      translationId: data.translation.identifier,
      translationName: data.translation.name,
      translationNote: data.translation.license,
      verses: [
        {
          bookId: rv.book_id,
          bookName: rv.book,
          chapter: rv.chapter,
          verse: rv.verse,
          text,
        },
      ],
    };
  } catch {
    return null;
  }
}

/** Books available for a translation (`GET /data/web`). */
export type BibleApiBook = {
  id: string;
  name: string;
  /** Present on some responses; otherwise empty. */
  testament: string;
};

export async function fetchBookList(
  translation: string = DEFAULT_TRANSLATION
): Promise<BibleApiBook[] | null> {
  const tid = translation.trim().toLowerCase();
  const url = `${BASE}/data/${tid}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      books?: Array<{
        id: string;
        name: string;
        testament?: string;
        url?: string;
      }>;
    };
    const books = data.books;
    if (!books?.length) return null;
    return books.map((b) => ({
      id: b.id,
      name: b.name,
      testament: b.testament ?? '',
    }));
  } catch {
    return null;
  }
}
