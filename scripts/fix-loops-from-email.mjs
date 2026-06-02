#!/usr/bin/env node
/**
 * Point Loops auth transactionals at growth@hilo-media.com (fromEmail: "growth").
 *
 *   LOOPS_API_KEY=your_key node scripts/fix-loops-from-email.mjs
 */

const LOOPS_API_KEY = process.env.LOOPS_API_KEY?.trim();
const LOOPS_BASE = 'https://app.loops.so/api';

const TX_IDS = [
  process.env.LOOPS_TX_MAGIC_LINK ?? 'cmbcmkriy29221c0ija767ig3',
  process.env.LOOPS_TX_CONFIRMATION ?? 'cmd3tw3ud2li8wa0icl6etxq1',
];

const FROM_EMAIL = process.env.LOOPS_FROM_EMAIL?.trim() || 'growth';
const FROM_NAME = process.env.LOOPS_FROM_NAME?.trim() || 'Flight Fitness';

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
    const msg =
      typeof data === 'object' && data?.message ? data.message : text.slice(0, 400);
    throw new Error(`Loops ${init.method ?? 'GET'} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

async function ensureDraft(transactionalId) {
  return loops(`/v2/transactional/${transactionalId}/draft`, { method: 'POST', body: '{}' });
}

async function updateSender(transactionalId) {
  const draft = await ensureDraft(transactionalId);
  const emailMessageId = draft.draftEmailMessageId;
  const revisionId =
    draft.draftEmailMessageContentRevisionId ?? draft.draftEmailMessageRevisionId;

  if (!emailMessageId || !revisionId) {
    throw new Error(`No draft message ids for transactional ${transactionalId}`);
  }

  const current = await loops(`/v1/email-messages/${emailMessageId}`);
  const fromEmail = current.fromEmail?.includes('@')
    ? current.fromEmail.split('@')[0]
    : current.fromEmail;

  if (fromEmail === FROM_EMAIL) {
    console.log(`${transactionalId}: already using fromEmail "${FROM_EMAIL}"`);
  } else {
    console.log(
      `${transactionalId}: ${fromEmail || '(empty)'} → ${FROM_EMAIL} (${FROM_NAME})`
    );
    await loops(`/v1/email-messages/${emailMessageId}`, {
      method: 'POST',
      body: JSON.stringify({
        expectedRevisionId: current.contentRevisionId ?? revisionId,
        fromEmail: FROM_EMAIL,
        fromName: FROM_NAME,
        replyToEmail: current.replyToEmail || `growth@hilo-media.com`,
      }),
    });
  }

  try {
    await loops(`/v2/transactional/${transactionalId}/publish`, {
      method: 'POST',
      body: '{}',
    });
    console.log(`${transactionalId}: published`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('sending domain is not verified')) {
      console.warn(
        `${transactionalId}: draft updated but publish blocked — verify hilo-media.com in Loops → Settings → Domains, then publish in the UI or re-run this script.`
      );
      return;
    }
    throw e;
  }
}

async function main() {
  if (!LOOPS_API_KEY) {
    console.error('Set LOOPS_API_KEY (Loops → Settings → API).');
    process.exit(1);
  }

  const keyCheck = await loops('/v1/api-key');
  console.log(`Loops team: ${keyCheck.teamName ?? 'OK'}`);
  console.log(`Setting sender to ${FROM_NAME} <${FROM_EMAIL}@your-verified-domain>`);

  for (const id of TX_IDS) {
    await updateSender(id);
  }

  console.log('\nDone. OTP emails should send from growth@hilo-media.com.');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
