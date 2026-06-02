#!/usr/bin/env node
/**
 * Print Loops auth-email diagnostics (domain, draft vs published sender, test API send).
 *
 *   LOOPS_API_KEY=... node scripts/diagnose-loops-email.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOOPS_API_KEY = process.env.LOOPS_API_KEY?.trim();
const LOOPS_BASE = 'https://app.loops.so/api';
const TX_IDS = [
  process.env.LOOPS_TX_MAGIC_LINK ?? 'cmbcmkriy29221c0ija767ig3',
  process.env.LOOPS_TX_CONFIRMATION ?? 'cmd3tw3ud2li8wa0icl6etxq1',
];

function loadEnv() {
  try {
    const env = readFileSync(resolve(__dirname, '../.env'), 'utf8');
    for (const line of env.split('\n')) {
      if (line.startsWith('LOOPS_API_KEY=') && !LOOPS_API_KEY) {
        return line.split('=').slice(1).join('=').trim();
      }
    }
  } catch {
    /* optional */
  }
  return LOOPS_API_KEY;
}

async function loops(path, init = {}) {
  const key = loadEnv();
  const res = await fetch(`${LOOPS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
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
  return { status: res.status, data, text };
}

async function emailMessage(id) {
  const { status, data } = await loops(`/v1/email-messages/${id}`);
  if (status !== 200) return null;
  const domainHint = data.replyToEmail?.includes('@')
    ? data.replyToEmail.split('@')[1]
    : '(unknown)';
  return {
    from: `${data.fromName} <${data.fromEmail}>`,
    replyTo: data.replyToEmail,
    domainHint,
  };
}

async function main() {
  const key = loadEnv();
  if (!key) {
    console.error('Set LOOPS_API_KEY in .env or the environment.');
    process.exit(1);
  }

  const team = await loops('/v1/api-key');
  console.log('Loops team:', team.data?.teamName ?? team.status);

  for (const txId of TX_IDS) {
    const tx = await loops(`/v2/transactional/${txId}`);
    if (tx.status !== 200) {
      console.log(`\n${txId}: could not load (${tx.status})`);
      continue;
    }
    console.log(`\n=== ${tx.data.name} (${txId}) ===`);
    const pub = await emailMessage(tx.data.publishedEmailMessageId);
    const draft = await emailMessage(tx.data.draftEmailMessageId);
    console.log('  LIVE (published):', pub?.from ?? '—');
    console.log('  DRAFT:', draft?.from ?? '—');
    if (pub?.domainHint) {
      console.log('  Likely Loops sending domain (from reply-to):', pub.domainHint);
    }
    if (pub?.from !== draft?.from) {
      console.log('  ⚠ Draft is not published — app still sends the LIVE version.');
    }
  }

  const send = await loops('/v1/transactional', {
    method: 'POST',
    body: JSON.stringify({
      transactionalId: TX_IDS[0],
      email: 'test@example.com',
      dataVariables: { Token: '000000' },
    }),
  });
  console.log('\nAPI test send (test@example.com):', send.status, send.data?.message ?? send.text);

  if (send.data?.message?.includes('not verified')) {
    console.log(`
Loops still reports NO verified sending domain on this team/API key.
- Open https://app.loops.so/settings?page=domain
- Confirm green "Records present" on the domain you send FROM
- Your templates reference hilo.media in reply-to; growth@hilo-media.com is a different domain.
- After DNS is green, click "Verify Records", publish both transactionals, then retry OTP.
`);
  } else if (send.status === 200) {
    console.log('\nLoops API accepts sends — publish drafts and test OTP in the app.');
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
