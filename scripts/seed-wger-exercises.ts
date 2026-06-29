#!/usr/bin/env npx tsx
/**
 * Seed wger exercise catalog into Supabase (CC-BY-SA 4.0).
 *
 * Requires service role (bypasses RLS):
 *   SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run seed:wger
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const WGER_BASE = 'https://wger.de/api/v2';
const ENGLISH_LANGUAGE_ID = 2;
const PAGE_LIMIT = 100;
const UPSERT_BATCH = 100;

type WgerPage<T> = {
  count: number;
  next: string | null;
  results: T[];
};

type WgerCategory = { id: number; name: string };

type WgerMuscle = {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
  image_url_main: string;
  image_url_secondary: string;
};

type WgerEquipment = { id: number; name: string };

type WgerTranslation = {
  language: number;
  name: string;
  description: string;
};

type WgerImage = {
  image: string;
  is_main: boolean;
  thumbnails?: { small?: string; medium?: string };
};

type WgerExerciseInfo = {
  id: number;
  uuid: string;
  category: WgerCategory | null;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  images: WgerImage[];
  translations: WgerTranslation[];
};

function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env for local seeding.`);
  }
  return value;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`wger request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchAllPages<T>(initialUrl: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = initialUrl;

  while (next) {
    const page = await fetchJson<WgerPage<T>>(next);
    items.push(...page.results);
    next = page.next;
    process.stdout.write(`\r  fetched ${items.length}…`);
  }

  process.stdout.write('\n');
  return items;
}

function getEnglishTranslation(
  translations: WgerTranslation[]
): WgerTranslation | null {
  return translations.find((t) => t.language === ENGLISH_LANGUAGE_ID) ?? null;
}

function pickImageUrls(images: WgerImage[]): {
  image_url: string | null;
  image_thumbnail_url: string | null;
} {
  const main = images.find((img) => img.is_main) ?? images[0];
  if (!main) {
    return { image_url: null, image_thumbnail_url: null };
  }
  return {
    image_url: main.image ?? null,
    image_thumbnail_url:
      main.thumbnails?.medium ?? main.thumbnails?.small ?? null,
  };
}

async function upsertBatches<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string
): Promise<void> {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      throw new Error(`${table} upsert failed: ${error.message}`);
    }
  }
}

async function seedCategories(supabase: SupabaseClient): Promise<void> {
  console.log('Seeding exercise_categories…');
  const categories = await fetchAllPages<WgerCategory>(
    `${WGER_BASE}/exercisecategory/?format=json&limit=${PAGE_LIMIT}`
  );
  await upsertBatches(
    supabase,
    'exercise_categories',
    categories.map((c) => ({ id: c.id, name: c.name })),
    'id'
  );
  console.log(`  ✓ ${categories.length} categories`);
}

async function seedMuscles(supabase: SupabaseClient): Promise<void> {
  console.log('Seeding muscles…');
  const muscles = await fetchAllPages<WgerMuscle>(
    `${WGER_BASE}/muscle/?format=json&limit=${PAGE_LIMIT}`
  );
  await upsertBatches(
    supabase,
    'muscles',
    muscles.map((m) => ({
      id: m.id,
      name: m.name,
      name_en: m.name_en || null,
      is_front: m.is_front,
      image_url_main: m.image_url_main,
      image_url_secondary: m.image_url_secondary,
    })),
    'id'
  );
  console.log(`  ✓ ${muscles.length} muscles`);
}

async function seedEquipment(supabase: SupabaseClient): Promise<void> {
  console.log('Seeding equipment…');
  const equipment = await fetchAllPages<WgerEquipment>(
    `${WGER_BASE}/equipment/?format=json&limit=${PAGE_LIMIT}`
  );
  await upsertBatches(
    supabase,
    'equipment',
    equipment.map((e) => ({ id: e.id, name: e.name })),
    'id'
  );
  console.log(`  ✓ ${equipment.length} equipment types`);
}

async function seedExercisesAndJoins(supabase: SupabaseClient): Promise<void> {
  console.log('Fetching exerciseinfo (English)…');
  const exerciseInfos = await fetchAllPages<WgerExerciseInfo>(
    `${WGER_BASE}/exerciseinfo/?format=json&language=${ENGLISH_LANGUAGE_ID}&limit=${PAGE_LIMIT}`
  );

  const exercises: Array<{
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    category_id: number | null;
    image_url: string | null;
    image_thumbnail_url: string | null;
  }> = [];
  const exerciseMuscles: Array<{
    exercise_id: number;
    muscle_id: number;
    is_primary: boolean;
  }> = [];
  const exerciseEquipment: Array<{
    exercise_id: number;
    equipment_id: number;
  }> = [];
  let skippedNoEnglish = 0;

  for (const info of exerciseInfos) {
    const english = getEnglishTranslation(info.translations);
    if (!english?.name?.trim()) {
      skippedNoEnglish += 1;
      continue;
    }

    const { image_url, image_thumbnail_url } = pickImageUrls(info.images);
    exercises.push({
      id: info.id,
      uuid: info.uuid,
      name: english.name.trim(),
      description: english.description
        ? stripHtml(english.description)
        : null,
      category_id: info.category?.id ?? null,
      image_url,
      image_thumbnail_url,
    });

    const seenMuscles = new Set<number>();
    for (const muscle of info.muscles ?? []) {
      if (seenMuscles.has(muscle.id)) continue;
      seenMuscles.add(muscle.id);
      exerciseMuscles.push({
        exercise_id: info.id,
        muscle_id: muscle.id,
        is_primary: true,
      });
    }
    for (const muscle of info.muscles_secondary ?? []) {
      if (seenMuscles.has(muscle.id)) continue;
      seenMuscles.add(muscle.id);
      exerciseMuscles.push({
        exercise_id: info.id,
        muscle_id: muscle.id,
        is_primary: false,
      });
    }

    const seenEquipment = new Set<number>();
    for (const item of info.equipment ?? []) {
      if (seenEquipment.has(item.id)) continue;
      seenEquipment.add(item.id);
      exerciseEquipment.push({
        exercise_id: info.id,
        equipment_id: item.id,
      });
    }
  }

  console.log(`Seeding exercises (${exercises.length}, skipped ${skippedNoEnglish} without English)…`);
  await upsertBatches(supabase, 'exercises', exercises, 'id');
  console.log(`  ✓ ${exercises.length} exercises`);

  console.log('Refreshing exercise_muscles join table…');
  const { error: clearMusclesError } = await supabase
    .from('exercise_muscles')
    .delete()
    .not('exercise_id', 'is', null);
  if (clearMusclesError) {
    throw new Error(`exercise_muscles clear failed: ${clearMusclesError.message}`);
  }
  await upsertBatches(supabase, 'exercise_muscles', exerciseMuscles, 'exercise_id,muscle_id');
  console.log(`  ✓ ${exerciseMuscles.length} exercise_muscles rows`);

  console.log('Refreshing exercise_equipment join table…');
  const { error: clearEquipmentError } = await supabase
    .from('exercise_equipment')
    .delete()
    .not('exercise_id', 'is', null);
  if (clearEquipmentError) {
    throw new Error(`exercise_equipment clear failed: ${clearEquipmentError.message}`);
  }
  await upsertBatches(
    supabase,
    'exercise_equipment',
    exerciseEquipment,
    'exercise_id,equipment_id'
  );
  console.log(`  ✓ ${exerciseEquipment.length} exercise_equipment rows`);
}

async function main(): Promise<void> {
  loadDotEnv();

  const url = requireEnv(
    'SUPABASE_URL',
    process.env.EXPO_PUBLIC_SUPABASE_URL
  );
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('wger → Supabase exercise catalog seed\n');

  await seedCategories(supabase);
  await seedMuscles(supabase);
  await seedEquipment(supabase);
  await seedExercisesAndJoins(supabase);

  const { count: exerciseCount, error: countError } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });
  if (countError) {
    throw new Error(`verify count failed: ${countError.message}`);
  }

  console.log(`\nDone. exercises table row count: ${exerciseCount ?? 0}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
