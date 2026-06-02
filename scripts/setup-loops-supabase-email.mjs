#!/usr/bin/env node
/**
 * Configures Loops SMTP JSON payloads on Supabase Auth email templates.
 *
 * Usage (from project root):
 *   LOOPS_API_KEY=your_key node scripts/setup-loops-supabase-email.mjs
 *
 * Optional:
 *   SUPABASE_PROJECT_REF=gdenhlzrvxsekdfzulii
 *   SUPABASE_ACCESS_TOKEN=...  (else reads Supabase CLI keychain token)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'gdenhlzrvxsekdfzulii';
const LOOPS_API_KEY = process.env.LOOPS_API_KEY?.trim();
const LOOPS_BASE = 'https://app.loops.so/api';

/** Prefer existing Loops transactionals (Flight Fitness / Hilo Media account). */
const TX_ONE_TIME_CODE = process.env.LOOPS_TX_MAGIC_LINK ?? 'cmbcmkriy29221c0ija767ig3';
const TX_CONFIRM_SIGNUP = process.env.LOOPS_TX_CONFIRMATION ?? 'cmd3tw3ud2li8wa0icl6etxq1';

const MAGIC_LINK_NAME = 'Flight Fitness — Magic Link (OTP)';
const CONFIRM_NAME = 'Flight Fitness — Confirm signup';

function getSupabaseAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }
  const raw = execSync('security find-generic-password -s "Supabase CLI" -w', {
    encoding: 'utf8',
  }).trim();
  return Buffer.from(raw.replace(/^go-keyring-base64:/, ''), 'base64').toString('utf8');
}

async function loops(path, init = {}) {
  const res = await fetch(`${LOOPS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(
      `Loops ${init.method ?? 'GET'} ${path} → ${res.status}: ${
        typeof data === 'object' && data?.message ? data.message : text.slice(0, 300)
      }`
    );
  }
  return data;
}

async function findTransactionalById(id) {
  const items = await listAllTransactionals();
  const hit = items.find((t) => t.id === id);
  if (hit) console.log(`Using Loops transactional: ${hit.name} (${hit.id})`);
  return hit?.id ?? null;
}

async function listAllTransactionals() {
  const items = [];
  let cursor;
  do {
    const q = new URLSearchParams({ perPage: '50' });
    if (cursor) q.set('cursor', cursor);
    const page = await loops(`/v1/transactional?${q}`);
    items.push(...(page.data ?? []));
    cursor = page.pagination?.nextCursor;
  } while (cursor);
  return items;
}

function otpLmx() {
  return `<Style themeId="default" />
<Paragraph><Text>Your Flight Fitness sign-in code:</Text></Paragraph>
<Paragraph><Text style="font-size: 32px; font-weight: bold;">{token}</Text></Paragraph>
<Paragraph><Text>This code expires in one hour. If you did not request it, you can ignore this email.</Text></Paragraph>`;
}

async function ensureTransactional(name) {
  const existing = (await listAllTransactionals()).find(
    (t) => t.name?.toLowerCase() === name.toLowerCase()
  );
  if (existing?.id) {
    console.log(`Found Loops transactional: ${name} (${existing.id})`);
    return existing.id;
  }

  console.log(`Creating Loops transactional: ${name}`);
  const created = await loops('/v2/transactional', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  const emailMessageId = created.draftEmailMessageId;
  const revisionId = created.draftEmailMessageContentRevisionId;
  if (!emailMessageId || !revisionId) {
    throw new Error(`Loops did not return draft message ids for ${name}`);
  }

  await loops(`/v1/email-messages/${emailMessageId}`, {
    method: 'POST',
    body: JSON.stringify({
      expectedRevisionId: revisionId,
      subject: name.includes('Magic') ? 'Your Flight Fitness login code' : 'Confirm your Flight Fitness email',
      previewText: 'Flight Fitness',
      fromName: 'Flight Fitness',
      fromEmail: process.env.LOOPS_FROM_EMAIL?.trim() || 'growth',
      lmx: otpLmx(),
    }),
  });

  await loops(`/v2/transactional/${created.transactionalId}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  console.log(`Published: ${name} (${created.transactionalId})`);
  return created.transactionalId;
}

function buildPayload(transactionalId, includeConfirmationUrl) {
  const dataVariables = {
    Token: '{{ .Token }}',
  };
  if (includeConfirmationUrl) {
    dataVariables.ConfirmationURL = '{{ .ConfirmationURL }}';
  }
  return JSON.stringify(
    {
      transactionalId,
      email: '{{ .Email }}',
      dataVariables,
    },
    null,
    2
  );
}

async function patchSupabaseAuth(magicLinkId, confirmId) {
  const token = getSupabaseAccessToken();
  const body = {
    mailer_templates_magic_link_content: buildPayload(magicLinkId, false),
    mailer_templates_confirmation_content: buildPayload(confirmId, true),
  };

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase PATCH auth config → ${res.status}: ${text.slice(0, 400)}`);
  }
  console.log('Updated Supabase Magic Link + Confirm signup templates.');
}

async function smokeTestOtp() {
  const envPath = resolve(__dirname, '../.env');
  let url;
  let anon;
  try {
    const env = readFileSync(envPath, 'utf8');
    for (const line of env.split('\n')) {
      if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) url = line.split('=').slice(1).join('=').trim();
      if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
        anon = line.split('=').slice(1).join('=').trim();
      }
    }
  } catch {
    /* optional */
  }
  if (!url || !anon) {
    console.log('Skip OTP smoke test (no .env Supabase vars).');
    return;
  }

  const email = `loops-setup-test-${Date.now()}@example.com`;
  const res = await fetch(`${url}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, create_user: true }),
  });
  const data = await res.json();
  if (res.ok) {
    console.log('OTP smoke test: OK (check Loops transactional metrics for delivery).');
    return;
  }
  console.warn('OTP smoke test failed:', JSON.stringify(data));
}

async function main() {
  if (!LOOPS_API_KEY) {
    console.error(
      'Missing LOOPS_API_KEY.\n' +
        'Get one from Loops → Settings → API, then run:\n' +
        '  LOOPS_API_KEY=your_key node scripts/setup-loops-supabase-email.mjs'
    );
    process.exit(1);
  }

  const keyCheck = await loops('/v1/api-key');
  console.log(`Loops team: ${keyCheck.teamName ?? 'OK'}`);

  const magicLinkId =
    (await findTransactionalById(TX_ONE_TIME_CODE)) ??
    (await ensureTransactional(MAGIC_LINK_NAME));
  const confirmId =
    (await findTransactionalById(TX_CONFIRM_SIGNUP)) ??
    (await ensureTransactional(CONFIRM_NAME));
  await patchSupabaseAuth(magicLinkId, confirmId);
  console.log(
    '\nNote: Supabase may HTML-escape SMTP template bodies. If OTP still fails, use the send-email auth hook (see supabase/functions/send-email).'
  );
  await smokeTestOtp();
  console.log('\nDone. Try “Send code” in the app with a real inbox address.');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
