# Flight Coaches Portal

Next.js app for Flight coaches (port **3004**). Replaces the legacy `coach-web/` folder.

## Setup

```bash
cd coaches
cp .env.local.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, optional COACH_ALLOWED_USER_IDS
npm install
npm run dev
```

Open [http://localhost:3004](http://localhost:3004).

## Features

- Public Flight-branded landing
- Email OTP signup / login
- Onboarding checklist (intro video required before Clients / Messages)
- Multi-client roster via `coach_clients` + invite codes
- Week plan push (meals + workouts), reflection prompts, messaging

## Related

- Migrations: `supabase/migrations/20260718190000_coaches_portal.sql`
- Mobile invite accept: `lib/api/coachInvite.ts` + Coaching Info screen
- Faith coach prompts: `lib/api/coachReflection.ts`
