import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

type VerseEntry = {
  id: string;
  text: string;
  reference: string;
  tags: string[];
};

const verses = JSON.parse("[{\"id\":\"v1\",\"text\":\"Whatever you do, work at it with all your heart, as working for the Lord.\",\"reference\":\"Colossians 3:23\",\"tags\":[\"discipline\",\"motivation\"]},{\"id\":\"v2\",\"text\":\"I can do all this through him who gives me strength.\",\"reference\":\"Philippians 4:13\",\"tags\":[\"strength\",\"motivation\"]},{\"id\":\"v3\",\"text\":\"She sets about her work vigorously; her arms are strong for her tasks.\",\"reference\":\"Proverbs 31:17\",\"tags\":[\"strength\",\"discipline\"]},{\"id\":\"v4\",\"text\":\"Do you not know that your bodies are temples of the Holy Spirit?\",\"reference\":\"1 Corinthians 6:19\",\"tags\":[\"motivation\",\"discipline\"]},{\"id\":\"v5\",\"text\":\"The Lord is my strength and my shield; my heart trusts in him, and he helps me.\",\"reference\":\"Psalm 28:7\",\"tags\":[\"strength\"]},{\"id\":\"v6\",\"text\":\"Give thanks in all circumstances; for this is God's will for you in Christ Jesus.\",\"reference\":\"1 Thessalonians 5:18\",\"tags\":[\"gratitude\"]},{\"id\":\"v7\",\"text\":\"Let us not become weary in doing good, for at the proper time we will reap a harvest.\",\"reference\":\"Galatians 6:9\",\"tags\":[\"discipline\",\"motivation\"]},{\"id\":\"v8\",\"text\":\"Taste and see that the Lord is good; blessed is the one who takes refuge in him.\",\"reference\":\"Psalm 34:8\",\"tags\":[\"gratitude\"]},{\"id\":\"v9\",\"text\":\"For physical training is of some value, but godliness has value for all things.\",\"reference\":\"1 Timothy 4:8\",\"tags\":[\"discipline\"]},{\"id\":\"v10\",\"text\":\"The joy of the Lord is your strength.\",\"reference\":\"Nehemiah 8:10\",\"tags\":[\"strength\",\"motivation\"]},{\"id\":\"v11\",\"text\":\"Commit to the Lord whatever you do, and he will establish your plans.\",\"reference\":\"Proverbs 16:3\",\"tags\":[\"motivation\",\"discipline\"]},{\"id\":\"v12\",\"text\":\"Be strong and courageous. Do not be afraid; do not be discouraged.\",\"reference\":\"Joshua 1:9\",\"tags\":[\"strength\",\"motivation\"]},{\"id\":\"v13\",\"text\":\"Enter his gates with thanksgiving and his courts with praise.\",\"reference\":\"Psalm 100:4\",\"tags\":[\"gratitude\"]},{\"id\":\"v14\",\"text\":\"A cheerful heart is good medicine, but a crushed spirit dries up the bones.\",\"reference\":\"Proverbs 17:22\",\"tags\":[\"gratitude\",\"motivation\"]},{\"id\":\"v15\",\"text\":\"He gives strength to the weary and increases the power of the weak.\",\"reference\":\"Isaiah 40:29\",\"tags\":[\"strength\"]},{\"id\":\"v16\",\"text\":\"No discipline seems pleasant at the time, but painful. Later it produces peace.\",\"reference\":\"Hebrews 12:11\",\"tags\":[\"discipline\"]},{\"id\":\"v17\",\"text\":\"I praise you because I am fearfully and wonderfully made.\",\"reference\":\"Psalm 139:14\",\"tags\":[\"gratitude\",\"motivation\"]},{\"id\":\"v18\",\"text\":\"Run in such a way as to get the prize.\",\"reference\":\"1 Corinthians 9:24\",\"tags\":[\"discipline\",\"motivation\"]},{\"id\":\"v19\",\"text\":\"The Lord is my strength and my defense; he has become my salvation.\",\"reference\":\"Exodus 15:2\",\"tags\":[\"strength\"]},{\"id\":\"v20\",\"text\":\"Give thanks to the Lord, for he is good; his love endures forever.\",\"reference\":\"Psalm 107:1\",\"tags\":[\"gratitude\"]},{\"id\":\"v21\",\"text\":\"Watch and pray so that you will not fall into temptation.\",\"reference\":\"Matthew 26:41\",\"tags\":[\"discipline\"]},{\"id\":\"v22\",\"text\":\"Those who hope in the Lord will renew their strength. They will soar on wings like eagles.\",\"reference\":\"Isaiah 40:31\",\"tags\":[\"strength\",\"motivation\"]},{\"id\":\"v23\",\"text\":\"And whatever you do, whether in word or deed, do it all in the name of the Lord Jesus.\",\"reference\":\"Colossians 3:17\",\"tags\":[\"discipline\",\"motivation\"]},{\"id\":\"v24\",\"text\":\"Let everything that has breath praise the Lord.\",\"reference\":\"Psalm 150:6\",\"tags\":[\"gratitude\"]},{\"id\":\"v25\",\"text\":\"Bless the Lord, O my soul, and forget not all his benefits.\",\"reference\":\"Psalm 103:2\",\"tags\":[\"gratitude\"]},{\"id\":\"v26\",\"text\":\"The name of the Lord is a fortified tower; the righteous run to it and are safe.\",\"reference\":\"Proverbs 18:10\",\"tags\":[\"strength\"]},{\"id\":\"v27\",\"text\":\"Consider it pure joy when you face trials, because the testing of your faith produces perseverance.\",\"reference\":\"James 1:2-3\",\"tags\":[\"discipline\",\"motivation\"]},{\"id\":\"v28\",\"text\":\"He has shown you what is good: to act justly, to love mercy, and to walk humbly with your God.\",\"reference\":\"Micah 6:8\",\"tags\":[\"discipline\"]},{\"id\":\"v29\",\"text\":\"Shout for joy to the Lord, all the earth.\",\"reference\":\"Psalm 100:1\",\"tags\":[\"gratitude\",\"motivation\"]},{\"id\":\"v30\",\"text\":\"Be on your guard; stand firm in the faith; be courageous; be strong.\",\"reference\":\"1 Corinthians 16:13\",\"tags\":[\"strength\",\"discipline\"]},{\"id\":\"v31\",\"text\":\"Teach us to number our days, that we may gain a heart of wisdom.\",\"reference\":\"Psalm 90:12\",\"tags\":[\"discipline\"]},{\"id\":\"v32\",\"text\":\"The Lord is my shepherd, I lack nothing.\",\"reference\":\"Psalm 23:1\",\"tags\":[\"gratitude\",\"motivation\"]},{\"id\":\"v33\",\"text\":\"But those who hope in the Lord will renew their strength.\",\"reference\":\"Isaiah 40:31\",\"tags\":[\"strength\"]},{\"id\":\"v34\",\"text\":\"In peace I will lie down and sleep, for you alone, Lord, make me dwell in safety.\",\"reference\":\"Psalm 4:8\",\"tags\":[\"gratitude\"]},{\"id\":\"v35\",\"text\":\"Therefore, I urge you, brothers and sisters, in view of God's mercy, to offer your bodies as a living sacrifice.\",\"reference\":\"Romans 12:1\",\"tags\":[\"discipline\",\"motivation\"]},{\"id\":\"v36\",\"text\":\"Love the Lord your God with all your heart and with all your soul and with all your mind.\",\"reference\":\"Matthew 22:37\",\"tags\":[\"motivation\",\"discipline\"]},{\"id\":\"v37\",\"text\":\"I will sing the Lord's praise, for he has been good to me.\",\"reference\":\"Psalm 13:6\",\"tags\":[\"gratitude\"]},{\"id\":\"v38\",\"text\":\"The Lord is my light and my salvation—whom shall I fear?\",\"reference\":\"Psalm 27:1\",\"tags\":[\"strength\",\"motivation\"]},{\"id\":\"v39\",\"text\":\"Let us run with perseverance the race marked out for us.\",\"reference\":\"Hebrews 12:1\",\"tags\":[\"discipline\",\"motivation\"]},{\"id\":\"v40\",\"text\":\"Every good and perfect gift is from above.\",\"reference\":\"James 1:17\",\"tags\":[\"gratitude\"]}]") as VerseEntry[];


const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function hashDateKey(utcYmd: string): number {
  let h = 0;
  for (let i = 0; i < utcYmd.length; i++) {
    h = (h << 5) - h + utcYmd.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function dailyVerseForUtcDay(utcYmd: string): VerseEntry {
  const idx = hashDateKey(utcYmd) % verses.length;
  return verses[idx]!;
}

function utcYmd(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function imagePromptForVerse(v: VerseEntry): string {
  const themes = v.tags.join(', ');
  return [
    'Wide cinematic fitness app hero image, abstract and inspirational, no text or letters.',
    'Soft golden sunrise light, athletic silhouette or motion blur, calm strength, premium minimal aesthetic.',
    `Emotional tone aligned with themes: ${themes}.`,
    'No religious figures, no identifiable people, no logos, no watermark.',
  ].join(' ');
}

async function generateAndStoreDaily(args: {
  day: string;
  verse: VerseEntry;
  supabaseUrl: string;
  serviceKey: string;
  openaiKey: string;
}): Promise<{ image_url: string } | { error: string; status: number }> {
  const { day, verse, supabaseUrl, serviceKey, openaiKey } = args;
  const admin = createClient(supabaseUrl, serviceKey);

  const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: imagePromptForVerse(verse),
      n: 1,
      size: '1792x1024',
      response_format: 'url',
      quality: 'standard',
    }),
  });

  if (!imgRes.ok) {
    const detail = (await imgRes.text()).slice(0, 500);
    return { error: `OpenAI images error: ${detail}`, status: 502 };
  }

  const imgJson = (await imgRes.json()) as {
    data?: { url?: string }[];
  };
  const remoteUrl = imgJson.data?.[0]?.url;
  if (!remoteUrl) {
    return { error: 'OpenAI returned no image URL', status: 502 };
  }

  const binRes = await fetch(remoteUrl);
  if (!binRes.ok) {
    return { error: 'Failed to download generated image', status: 502 };
  }
  const buf = new Uint8Array(await binRes.arrayBuffer());
  const path = `${day}.png`;

  const { error: upErr } = await admin.storage.from('daily-hero').upload(path, buf, {
    contentType: 'image/png',
    upsert: true,
  });
  if (upErr) {
    return { error: `Storage upload failed: ${upErr.message}`, status: 500 };
  }

  const image_url = `${supabaseUrl}/storage/v1/object/public/daily-hero/${path}`;

  const { error: insErr } = await admin.from('daily_readings').insert({
    day,
    verse_id: verse.id,
    text: verse.text,
    reference: verse.reference,
    tags: verse.tags,
    image_url,
  });

  if (insErr) {
    if (insErr.code === '23505') {
      return { image_url };
    }
    return { error: `DB insert failed: ${insErr.message}`, status: 500 };
  }

  return { image_url };
}

function parseBearerJwt(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
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
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Server missing SERVICE_ROLE_KEY secret' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Server missing OPENAI_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const day = utcYmd();
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: existing, error: selErr } = await admin
      .from('daily_readings')
      .select('day, verse_id, text, reference, tags, image_url')
      .eq('day', day)
      .maybeSingle();

    if (selErr) {
      return new Response(JSON.stringify({ error: selErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existing) {
      return new Response(
        JSON.stringify({
          day: existing.day,
          verse: {
            id: existing.verse_id,
            text: existing.text,
            reference: existing.reference,
            tags: existing.tags,
          },
          image_url: existing.image_url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verse = dailyVerseForUtcDay(day);
    const gen = await generateAndStoreDaily({
      day,
      verse,
      supabaseUrl,
      serviceKey,
      openaiKey,
    });

    if ('error' in gen) {
      return new Response(JSON.stringify({ error: gen.error }), {
        status: gen.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: row } = await admin
      .from('daily_readings')
      .select('day, verse_id, text, reference, tags, image_url')
      .eq('day', day)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Daily row missing after generate' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        day: row.day,
        verse: {
          id: row.verse_id,
          text: row.text,
          reference: row.reference,
          tags: row.tags,
        },
        image_url: row.image_url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
