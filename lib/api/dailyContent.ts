import { z } from 'zod';
import { Image } from 'react-native';

import {
  ensureFreshSessionForEdge,
  supabaseConfigured,
} from '@/lib/supabase';
import { verseTagSchema } from '@/types/plan';

const dailyVerseSchema = z.object({
  id: z.string(),
  text: z.string(),
  reference: z.string(),
  tags: z.array(verseTagSchema),
});

const dailyContentSchema = z.object({
  day: z.string(),
  verse: dailyVerseSchema,
  image_url: z.string().min(1),
});

export type DailyContent = z.infer<typeof dailyContentSchema>;

export type DailyContentFetchResult =
  | { ok: true; data: DailyContent }
  | { ok: false; message: string };

export async function fetchDailyContentRaw(): Promise<DailyContentFetchResult> {
  if (!supabaseConfigured) {
    return { ok: false, message: 'Supabase is not configured.' };
  }
  const session = await ensureFreshSessionForEdge();
  if (!session?.access_token) {
    return { ok: false, message: 'Sign in to load daily content.' };
  }

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const url = `${base.replace(/\/$/, '')}/functions/v1/daily-content`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(anon ? { apikey: anon } : {}),
      },
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const errMsg =
        json &&
        typeof json === 'object' &&
        'error' in json &&
        typeof (json as { error: unknown }).error === 'string'
          ? (json as { error: string }).error
          : `Request failed (${res.status})`;
      return { ok: false, message: errMsg };
    }
    const parsed = dailyContentSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, message: 'Unexpected response from daily-content.' };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, message: 'Network error while calling daily-content.' };
  }
}

export async function fetchDailyContent(): Promise<DailyContent | null> {
  const r = await fetchDailyContentRaw();
  return r.ok ? r.data : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Warm RN image cache. Retries help right after upload when the public URL
 * can briefly 404 until storage/CDN is consistent.
 */
export async function prefetchDailyHeroImage(
  content: DailyContent | null
): Promise<void> {
  const url = content?.image_url;
  if (!url) return;

  const delays = [0, 120, 350, 700, 1400];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (attempt > 0) await sleep(delays[attempt]!);
    try {
      const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
      if (head && !head.ok && head.status !== 405) {
        continue;
      }
    } catch {
      /* ignore; try prefetch anyway */
    }
    try {
      const ok = await Image.prefetch(url);
      if (ok) return;
    } catch {
      /* retry */
    }
  }
}
