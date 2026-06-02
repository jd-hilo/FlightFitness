import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const LOOPS_API = 'https://app.loops.so/api/v1/transactional';

/** Published Loops transactionals in Hilo Media / Flight Fitness account */
const TX_ONE_TIME_CODE = 'cmbcmkriy29221c0ija767ig3';
const TX_CONFIRM_SIGNUP = 'cmd3tw3ud2li8wa0icl6etxq1';

type HookPayload = {
  user: { email: string };
  email_data: {
    token: string;
    email_action_type: string;
    redirect_to?: string;
    site_url?: string;
  };
};

function transactionalForAction(action: string): string | null {
  switch (action) {
    case 'signup':
      return TX_CONFIRM_SIGNUP;
    case 'magiclink':
    case 'recovery':
    case 'invite':
    case 'reauthentication':
    case 'email_change':
    case 'email_change_current':
    case 'email_change_new':
      return TX_ONE_TIME_CODE;
    default:
      return TX_ONE_TIME_CODE;
  }
}

function dataVariablesForAction(
  action: string,
  emailData: HookPayload['email_data']
): Record<string, string> {
  const vars: Record<string, string> = { Token: emailData.token };
  if (action === 'signup' && emailData.redirect_to) {
    vars.ConfirmationURL = emailData.redirect_to;
  }
  return vars;
}

async function sendLoopsTransactional(
  transactionalId: string,
  email: string,
  dataVariables: Record<string, string>
): Promise<void> {
  const apiKey = Deno.env.get('LOOPS_API_KEY')?.trim();
  if (!apiKey) {
    throw new Error('LOOPS_API_KEY is not set on the send-email function');
  }

  const res = await fetch(LOOPS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId,
      email,
      dataVariables,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* use raw */
    }
    throw new Error(message);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const rawSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  if (!rawSecret) {
    return new Response(JSON.stringify({ error: 'SEND_EMAIL_HOOK_SECRET missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const hookSecret = rawSecret.replace(/^v1,whsec_/, '');
  const payload = await req.text();
  const headers: Record<string, string> = {};
  for (const [key, value] of req.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }

  try {
    const verified = new Webhook(hookSecret).verify(payload, headers) as HookPayload;
    const email = verified.user.email?.trim();
    if (!email) {
      throw new Error('Missing user email on auth hook payload');
    }

    const action = verified.email_data.email_action_type;
    const transactionalId = transactionalForAction(action);
    if (!transactionalId) {
      throw new Error(`Unsupported email_action_type: ${action}`);
    }

    await sendLoopsTransactional(
      transactionalId,
      email,
      dataVariablesForAction(action, verified.email_data)
    );

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[send-email]', message);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
