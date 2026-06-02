#!/usr/bin/env node
/**
 * Edit Loops OTP + confirm-signup transactionals (Flight Fitness copy, growth sender).
 *
 *   LOOPS_API_KEY=... node scripts/edit-loops-auth-emails.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOOPS_BASE = 'https://app.loops.so/api';

const EMAILS = [
  {
    transactionalId: process.env.LOOPS_TX_MAGIC_LINK ?? 'cmbcmkriy29221c0ija767ig3',
    subject: 'Your Flight Fitness login code',
    previewText: 'Use this code to sign in',
    bodyIntro: 'Your sign-in code for Flight Fitness:',
  },
  {
    transactionalId: process.env.LOOPS_TX_CONFIRMATION ?? 'cmd3tw3ud2li8wa0icl6etxq1',
    subject: 'Confirm your Flight Fitness email',
    previewText: 'Verify your email to get started',
    bodyIntro: 'Use this code to confirm your email for Flight Fitness:',
  },
];

const STYLE = `<Style backgroundColor="#f5f5f4" backgroundXPadding="0" backgroundYPadding="24" bodyColor="#ffffff" bodyXPadding="24" bodyYPadding="20" bodyFontFamily="Default" bodyFontCategory="sans-serif" borderColor="#000000" borderWidth="0" borderRadius="4" buttonBodyColor="#000000" buttonBodyXPadding="18" buttonBodyYPadding="10" buttonBorderColor="#727272" buttonBorderWidth="1" buttonBorderRadius="4" buttonTextColor="" buttonTextFormat="0" buttonTextFontSize="16" dividerColor="#f5f5f4" dividerBorderWidth="1" textBaseColor="" textBaseFontSize="15" textBaseLineHeight="150" textBaseLetterSpacing="0" textLinkColor="" heading1Color="" heading1FontSize="30" heading1LineHeight="107" heading1LetterSpacing="0" heading2Color="" heading2FontSize="24" heading2LineHeight="133" heading2LetterSpacing="0" heading3Color="" heading3FontSize="20" heading3LineHeight="160" heading3LetterSpacing="0" />`;

function otpLmx(intro) {
  return `${STYLE}
<Paragraph fontSize="16" lineHeight="150">${intro}</Paragraph>
<Paragraph fontSize="36" lineHeight="120"><Strong>{data.Token}</Strong></Paragraph>
<Paragraph fontSize="14" lineHeight="150">This code expires in one hour. If you did not request it, you can ignore this email.</Paragraph>
<Paragraph fontSize="14" lineHeight="150">— Flight Fitness</Paragraph>`;
}

function loadApiKey() {
  if (process.env.LOOPS_API_KEY?.trim()) return process.env.LOOPS_API_KEY.trim();
  try {
    const env = readFileSync(resolve(__dirname, '../.env'), 'utf8');
    for (const line of env.split('\n')) {
      if (line.startsWith('LOOPS_API_KEY=')) {
        return line.split('=').slice(1).join('=').trim();
      }
    }
  } catch {
    /* optional */
  }
  return null;
}

async function loops(apiKey, path, init = {}) {
  const res = await fetch(`${LOOPS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

async function editTransactional(apiKey, { transactionalId, subject, previewText, bodyIntro }) {
  await loops(apiKey, `/v2/transactional/${transactionalId}/draft`, {
    method: 'POST',
    body: '{}',
  });
  const tx = await loops(apiKey, `/v2/transactional/${transactionalId}`);
  const emailMessageId = tx.draftEmailMessageId;
  const current = await loops(apiKey, `/v1/email-messages/${emailMessageId}`);

  await loops(apiKey, `/v1/email-messages/${emailMessageId}`, {
    method: 'POST',
    body: JSON.stringify({
      expectedRevisionId: current.contentRevisionId,
      subject,
      previewText,
      fromName: 'Flight Fitness',
      fromEmail: 'growth',
      replyToEmail: 'growth@hilo-media.com',
      lmx: otpLmx(bodyIntro),
    }),
  });

  console.log(`Updated draft: ${tx.name} (${transactionalId})`);

  try {
    await loops(apiKey, `/v2/transactional/${transactionalId}/publish`, {
      method: 'POST',
      body: '{}',
    });
    console.log(`  Published.`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('sending domain is not verified')) {
      console.warn(`  Draft saved; publish blocked until hilo-media.com DNS is verified in Loops.`);
      return;
    }
    throw e;
  }
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('Set LOOPS_API_KEY in .env');
    process.exit(1);
  }

  const team = await loops(apiKey, '/v1/api-key');
  console.log(`Loops team: ${team.teamName ?? 'OK'}\n`);

  for (const email of EMAILS) {
    await editTransactional(apiKey, email);
  }

  console.log('\nDone. Open Loops → Transactional to preview; publish in UI if API publish was blocked.');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
