-- Flight Fitness — profiles + plans (RLS)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  onboarding_json jsonb default '{}'::jsonb,
  subscription_tier text not null default 'free',
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists plans_user_week on public.plans (user_id, week_start desc);

alter table public.profiles enable row level security;
alter table public.plans enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "plans_select_own"
  on public.plans for select
  using (auth.uid() = user_id);

create policy "plans_insert_own"
  on public.plans for insert
  with check (auth.uid() = user_id);

create policy "plans_update_own"
  on public.plans for update
  using (auth.uid() = user_id);
