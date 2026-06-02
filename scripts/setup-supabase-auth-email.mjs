#!/usr/bin/env node
/**
 * Flight Fitness (gdenhlzrvxsekdfzulii): Loops custom SMTP + auth email templates.
 *
 *   node scripts/setup-supabase-auth-email.mjs
 *   node scripts/setup-supabase-auth-email.mjs --with-hook   # also enable send-email edge hook
 *
 * Reads LOOPS_API_KEY from .env.
 */

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'gdenhlzrvxsekdfzulii';
const HOOK_URI = `https://${PROJECT_REF}.supabase.co/functions/v1/send-email`;

const TX_ONE_TIME_CODE = process.env.LOOPS_TX_MAGIC_LINK ?? 'cmbcmkriy29221c0ija767ig3';
const TX_CONFIRM_SIGNUP = process.env.LOOPS_TX_CONFIRMATION ?? 'cmd3tw3ud2li8wa0icl6etxq1';

const SMTP = {
  host: 'smtp.loops.so',
  port: '587',
  user: 'loops',
  adminEmail: process.env.SMTP_ADMIN_EMAIL?.trim() || 'growth@hilo-media.com',
  senderName: process.env.SMTP_SENDER_NAME?.trim() || 'Flight Fitness',
};

const withHook = process.argv.includes('--with-hook');

function getSupabaseAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }
  const raw = execSync('security find-generic-password -s "Supabase CLI" -w', {
    encoding: 'utf8',
  }).trim();
  return Buffer.from(raw.replace(/^go-keyring-base64:/, ''), 'base64').toString('utf8');
}

function loadEnv() {
  const out = {};
  try {
    const env = readFileSync(resolve(__dirname, '../.env'), 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* optional */
  }
  return out;
}

function newHookSecret() {
  return `v1,whsec_${randomBytes(24).toString('base64')}`;
}

function buildLoopsTemplatePayload(transactionalId, includeConfirmationUrl) {
  const dataVariables = { Token: '{{ .Token }}' };
  if (includeConfirmationUrl) {
    dataVariables.ConfirmationURL = '{{ .ConfirmationURL }}';
  }
  return JSON.stringify(
    { transactionalId, email: '{{ .Email }}', dataVariables },
    null,
    2
  );
}

async function patchAuth(body) {
  const token = getSupabaseAccessToken();
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
    throw new Error(`Auth PATCH → ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  const env = loadEnv();
  const loopsKey = process.env.LOOPS_API_KEY?.trim() || env.LOOPS_API_KEY;
  if (!loopsKey) {
    console.error('Missing LOOPS_API_KEY in .env');
    process.exit(1);
  }

  console.log(`Project: Flight Fitness (${PROJECT_REF})`);
  console.log('Configuring Loops custom SMTP…\n');

  const authPatch = {
    external_email_enabled: true,
    disable_signup: false,
    external_anonymous_users_enabled: true,
    mailer_autoconfirm: false,
    mailer_otp_length: 6,
    mailer_otp_exp: 3600,
    rate_limit_email_sent: 30,
    smtp_host: SMTP.host,
    smtp_port: SMTP.port,
    smtp_user: SMTP.user,
    smtp_pass: loopsKey,
    smtp_admin_email: SMTP.adminEmail,
    smtp_sender_name: SMTP.senderName,
    mailer_templates_magic_link_content: buildLoopsTemplatePayload(TX_ONE_TIME_CODE, false),
    mailer_templates_confirmation_content: buildLoopsTemplatePayload(TX_CONFIRM_SIGNUP, true),
  };

  if (withHook) {
    const hookSecret = newHookSecret();
    execSync(
      `supabase secrets set LOOPS_API_KEY=${shellQuote(loopsKey)} SEND_EMAIL_HOOK_SECRET=${shellQuote(hookSecret)} --project-ref ${PROJECT_REF}`,
      { stdio: 'inherit', cwd: resolve(__dirname, '..') }
    );
    authPatch.hook_send_email_enabled = true;
    authPatch.hook_send_email_uri = HOOK_URI;
    authPatch.hook_send_email_secrets = hookSecret;
  } else {
    authPatch.hook_send_email_enabled = false;
  }

  await patchAuth(authPatch);

  console.log('Custom SMTP (Loops):');
  console.log(`  Host: ${SMTP.host}:${SMTP.port}`);
  console.log(`  User: ${SMTP.user}`);
  console.log(`  Sender: ${SMTP.senderName} <${SMTP.adminEmail}>`);
  console.log('  Password: LOOPS_API_KEY (from .env)');
  console.log('\nEmail templates (JSON payloads for Loops SMTP):');
  console.log(`  Magic Link → ${TX_ONE_TIME_CODE}`);
  console.log(`  Confirm signup → ${TX_CONFIRM_SIGNUP}`);
  console.log('  Both include {{ .Token }} for OTP');

  if (withHook) {
    console.log('\nSend-email hook: enabled (SMTP + hook; hook takes precedence for auth mail)');
    console.log('Deploy: supabase functions deploy send-email --project-ref', PROJECT_REF);
  } else {
    console.log('\nSend-email hook: disabled (auth mail uses custom SMTP only)');
  }

  console.log(
    `\nDashboard: https://supabase.com/dashboard/project/${PROJECT_REF}/auth/smtp`
  );
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
