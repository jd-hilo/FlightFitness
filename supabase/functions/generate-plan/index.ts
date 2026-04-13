import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type GenerateBody = {
  onboarding?: Record<string, unknown>;
  onboardingSummary?: string;
  action?: string;
  currentPlan?: unknown;
  swapMeal?: { dayIndex: number; slot: string; note?: string };
  regenerateDay?: { dayIndex: number };
  adjustMacros?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  swapExercise?: { dayIndex: number; exerciseIndex: number; note?: string };
};

const SCHEMA_HINT = `Return ONLY valid JSON matching this shape:
{
  "weekStart": "YYYY-MM-DD (Monday of this plan week)",
  "macroTargets": { "calories": number, "proteinG": number, "carbsG": number, "fatG": number },
  "mealsByDay": [ /* 7 arrays, each of meals for that day */ ],
  "workoutsByDay": [ /* 7 items: either null (rest) or { "dayIndex": 0-6, "title": string, "exercises": [{ "id", "name", "sets", "reps", "restSec", "notes?" }] } */ ],
  "groceryList": [{ "name": string, "quantity"?: string, "category"?: string }]
}
Each meal: { "id", "slot": "breakfast"|"lunch"|"dinner"|"snack", "name", "description", "recipe"?, "macros": { "proteinG", "carbsG", "fatG", "kcal" } }.
dayIndex on each workout must match its array index (0=Monday).`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'Server missing OPENAI_API_KEY secret' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = (await req.json()) as GenerateBody;
    const onboarding = body.onboarding ?? {};
    const profileBlock =
      typeof body.onboardingSummary === 'string' && body.onboardingSummary.length
        ? body.onboardingSummary
        : JSON.stringify(onboarding);

    const userPrompt =
      body.action && body.action !== 'full' && body.currentPlan
        ? `Customization action: ${body.action}. Payload: ${JSON.stringify({
            swapMeal: body.swapMeal,
            regenerateDay: body.regenerateDay,
            adjustMacros: body.adjustMacros,
            swapExercise: body.swapExercise,
          })}. Current plan JSON (merge changes): ${JSON.stringify(body.currentPlan).slice(0, 12000)}`
        : `Create a 7-day meal and workout plan for this athlete profile:\n\n${profileBlock}\n\nRaw selections JSON (IDs): ${JSON.stringify(onboarding)}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are Flight Fitness AI. Output strict JSON only for a weekly meal and workout plan. ${SCHEMA_HINT}`,
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: 'OpenAI error', detail: errText.slice(0, 500) }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Empty model response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plan = JSON.parse(content);

    await supabase.from('plans').insert({
      user_id: user.id,
      week_start: plan.weekStart ?? '',
      payload: plan,
    });

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
