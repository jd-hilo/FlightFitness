import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { normalizeWeekPlanFromAI } from '../_shared/weekPlanNormalize.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type GenerateBody = {
  onboarding?: Record<string, unknown>;
  onboardingSummary?: string;
  weekStartHint?: string;
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

function parseBearerJwt(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

const SCHEMA_HINT = `Return ONLY valid JSON matching this exact shape — no markdown, no comments, no extra keys:
{
  "weekStart": "YYYY-MM-DD",
  "macroTargets": { "calories": number, "proteinG": number, "carbsG": number, "fatG": number },
  "mealsByDay": [/* exactly 7 arrays (index 0=Monday) */],
  "workoutsByDay": [/* exactly 7 items: null for rest, or { "dayIndex": N, "title": string, "exercises": [...] } */],
  "groceryList": [{ "name": string, "quantity"?: string, "category"?: string }]
}
Each meal object: { "id": "unique-string", "slot": "breakfast"|"lunch"|"dinner"|"snack", "name": string, "description": string, "recipe": string, "macros": { "proteinG": number, "carbsG": number, "fatG": number, "kcal": number } }.
Each exercise object: { "id": "unique-string", "name": string, "sets": number, "reps": "string (e.g. '8-12')", "restSec": number, "notes": "optional string or omit" }.
dayIndex on each workout MUST equal its 0-based array index. Every training day MUST have a non-empty exercises array.
workoutsByDay layout: spread training and rest across Mon–Sun (see TRAINING WEEK LAYOUT below).`;

const SYSTEM_PROMPT = `You are Flight Fitness AI — a certified strength & conditioning coach (CSCS) and registered sports dietitian.
You create complete, evidence-based 7-day meal + training plans personalized to each athlete.

TRAINING GUIDELINES:
• Program compound lifts first (squat, bench, deadlift, row, OHP), then isolation/accessory work.
• Match volume and intensity to the athlete's experience: beginners get fewer sets with technique focus; advanced get higher volume with periodization cues.
• Respect every injury / limitation — NEVER program a contraindicated movement. Offer a safe alternative and note why.
• Vary rep ranges across the week: strength (3-6 reps), hypertrophy (8-12), muscular endurance / pump (15-20).
• Include warm-up guidance and tempo cues in exercise notes where helpful.
• The number of non-null training days in workoutsByDay MUST exactly match their stated training-days-per-week preference (and never exceed 7).
• Each training day needs a clear title describing the focus (e.g. "Upper — Push emphasis", "Lower — Posterior chain").

TRAINING WEEK LAYOUT (workoutsByDay — index 0 = Monday, 6 = Sunday; null = scheduled rest / recovery):
• Interleave training and rest across the calendar week. Do NOT front-load all workouts on early weekdays and leave Fri–Sun (or any block of 3+ days) all null unless their requested frequency mathematically forces it (it rarely does for 3–5 days/week).
• Never schedule four or more consecutive calendar days with a real workout (null breaks streaks).
• Never schedule four or more consecutive null rest days whenever they train two or more days per week — spread rest between lifting days (e.g. Mon/Wed/Fri/Sat for four sessions, not Mon–Thu lifts then Fri–Sun all off).
• For 1–5 training days per week: prefer at most two consecutive lifting days before a null rest day appears in the array.
• For 6 training days (one rest): you may allow one stretch of three consecutive lifting days at most; place the single null on a day that breaks the longest would-be streak.
• For 7 training days: every entry is a workout; no nulls.
• Exception: if you output only one training day in the week (rare low-frequency interpretation), longer single blocks of null rest around that day are acceptable.

NUTRITION GUIDELINES:
• Set daily calories based on body stats, goal, and their chosen nutrition pace (aggressive deficit, moderate, surplus, etc.).
• Distribute protein ≥ 0.8 g/lb bodyweight for hypertrophy; adjust carbs and fat to fill remaining calories per their goal.
• Respect ALL dietary restrictions, allergies, religious rules, and cultural food preferences — zero exceptions.
• Meal count and structure must match their "meals per day" preference (e.g. 3 meals, 4 meals + snack, etc.).
• Recipe complexity must match their cooking skill — beginners get simple 5-ingredient meals; experienced cooks get more elaborate options.
• Every meal needs a practical recipe with clear, concise steps.
• Provide diverse, appetizing food — rotate cuisines, avoid repetitive "bro food" (chicken-rice-broccoli every day).
• Snacks should be functional: pre-workout fuel, post-workout recovery, or macro-filler — not filler junk.

GROCERY LIST:
• Consolidate all ingredients across the 7 days into one list.
• Group by category (produce, protein/meat, dairy, grains/pantry, oils/condiments, frozen).
• Use realistic quantities for one person for one week.

${SCHEMA_HINT}`;

function briefPriorSummary(
  payload: Record<string, unknown>,
  weekStart: string
): string {
  const mt = payload.macroTargets;
  let s = `Prior plan (week of ${weekStart})`;
  if (mt && typeof mt === 'object') {
    const m = mt as Record<string, unknown>;
    if (m.calories != null) s += `: ~${m.calories} kcal/day`;
    if (m.proteinG != null && m.carbsG != null && m.fatG != null) {
      s += `, P${m.proteinG}g / C${m.carbsG}g / F${m.fatG}g`;
    }
  }
  const wd = payload.workoutsByDay;
  let lifts = 0;
  if (Array.isArray(wd)) {
    for (const x of wd) if (x != null) lifts++;
  }
  s += `; ${lifts} training days`;
  const meals = payload.mealsByDay;
  const names: string[] = [];
  if (Array.isArray(meals)) {
    outer: for (const day of meals) {
      if (!Array.isArray(day)) continue;
      for (const meal of day) {
        if (
          meal &&
          typeof meal === 'object' &&
          typeof (meal as { name?: string }).name === 'string'
        ) {
          names.push((meal as { name: string }).name);
          if (names.length >= 6) break outer;
        }
      }
    }
  }
  if (names.length) s += `. Sample meals: ${names.join(', ')}`;
  return s.slice(0, 500);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const jwt = parseBearerJwt(req.headers.get('Authorization'));
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(jwt);
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

    const profileBlock =
      typeof body.onboardingSummary === 'string' && body.onboardingSummary.length > 0
        ? body.onboardingSummary
        : JSON.stringify(body.onboarding ?? {});

    const isCustomization =
      Boolean(body.action && body.action !== 'full' && body.currentPlan);

    let userPrompt: string;

    if (isCustomization) {
      userPrompt = `Customization action: ${body.action}. Payload: ${JSON.stringify({
        swapMeal: body.swapMeal,
        regenerateDay: body.regenerateDay,
        adjustMacros: body.adjustMacros,
        swapExercise: body.swapExercise,
      })}. Current plan JSON (merge changes into existing plan): ${JSON.stringify(body.currentPlan).slice(0, 12000)}`;
    } else {
      const rawHint =
        typeof body.weekStartHint === 'string' ? body.weekStartHint.trim() : '';
      const weekHint = /^\d{4}-\d{2}-\d{2}$/.test(rawHint) ? rawHint : '';

      let priorContext = '';
      if (weekHint) {
        try {
          const { data: priors } = await supabase
            .from('plans')
            .select('week_start, payload')
            .eq('user_id', user.id)
            .neq('week_start', weekHint)
            .order('created_at', { ascending: false })
            .limit(1);
          const prior = priors?.[0];
          if (prior?.payload && typeof prior.payload === 'object') {
            priorContext = briefPriorSummary(
              prior.payload as Record<string, unknown>,
              String(prior.week_start)
            );
          }
        } catch {
          // prior lookup is best-effort
        }
      }

      const parts: string[] = [
        `Generate a complete 7-day meal and workout plan for this athlete.`,
      ];

      if (weekHint) {
        parts.push(`\nweekStart in your JSON MUST be exactly "${weekHint}" (that Monday).`);
      }

      parts.push(`\n--- ATHLETE PROFILE ---\n${profileBlock}`);

      if (priorContext) {
        parts.push(
          `\n--- PRIOR WEEK (for continuity — vary meals/exercises, keep similar macro targets) ---\n${priorContext}`
        );
      }

      userPrompt = parts.join('\n');
    }

    const openaiBody = {
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiBody),
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

    const plan = normalizeWeekPlanFromAI(JSON.parse(content)) as Record<
      string,
      unknown
    >;

    if (!isCustomization && typeof body.weekStartHint === 'string') {
      const pinned = body.weekStartHint.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(pinned)) {
        plan.weekStart = pinned;
      }
    }

    await supabase.from('plans').insert({
      user_id: user.id,
      week_start:
        typeof plan.weekStart === 'string' ? plan.weekStart : String(plan.weekStart ?? ''),
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
