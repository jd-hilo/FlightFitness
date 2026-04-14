import { z } from 'zod';

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

export async function fetchDailyContent(): Promise<DailyContent | null> {
  if (!supabaseConfigured) return null;
  const session = await ensureFreshSessionForEdge();
  if (!session?.access_token) return null;

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
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const parsed = dailyContentSchema.safeParse(json);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
