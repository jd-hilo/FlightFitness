-- Weight log, workout library, completed sessions, and daily meal/workout completions

create table if not exists public.weight_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  date_key text not null,
  weight_lb numeric(5, 1) not null check (weight_lb >= 50 and weight_lb <= 600),
  updated_at timestamptz not null default now(),
  primary key (user_id, date_key)
);

create table if not exists public.user_workouts (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists user_workouts_user_updated_desc
  on public.user_workouts (user_id, updated_at desc);

create table if not exists public.workout_sessions (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_workout_id text not null,
  title text not null,
  date_key text not null,
  finished_at timestamptz not null,
  duration_sec integer not null default 0 check (duration_sec >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists workout_sessions_user_finished_desc
  on public.workout_sessions (user_id, finished_at desc);

create table if not exists public.daily_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  date_key text not null,
  meal_ids jsonb not null default '[]'::jsonb,
  workout_done boolean not null default false,
  exercise_ids_done jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date_key)
);

create table if not exists public.user_activity_meta (
  user_id uuid primary key references auth.users (id) on delete cascade,
  training_streak integer not null default 0,
  last_streak_increment_date text,
  updated_at timestamptz not null default now()
);

alter table public.weight_entries enable row level security;
alter table public.user_workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.daily_completions enable row level security;
alter table public.user_activity_meta enable row level security;

-- weight_entries
drop policy if exists "weight_entries_select_own" on public.weight_entries;
create policy "weight_entries_select_own"
  on public.weight_entries for select using (auth.uid() = user_id);
drop policy if exists "weight_entries_insert_own" on public.weight_entries;
create policy "weight_entries_insert_own"
  on public.weight_entries for insert with check (auth.uid() = user_id);
drop policy if exists "weight_entries_update_own" on public.weight_entries;
create policy "weight_entries_update_own"
  on public.weight_entries for update using (auth.uid() = user_id);

-- user_workouts
drop policy if exists "user_workouts_select_own" on public.user_workouts;
create policy "user_workouts_select_own"
  on public.user_workouts for select using (auth.uid() = user_id);
drop policy if exists "user_workouts_insert_own" on public.user_workouts;
create policy "user_workouts_insert_own"
  on public.user_workouts for insert with check (auth.uid() = user_id);
drop policy if exists "user_workouts_update_own" on public.user_workouts;
create policy "user_workouts_update_own"
  on public.user_workouts for update using (auth.uid() = user_id);
drop policy if exists "user_workouts_delete_own" on public.user_workouts;
create policy "user_workouts_delete_own"
  on public.user_workouts for delete using (auth.uid() = user_id);

-- workout_sessions
drop policy if exists "workout_sessions_select_own" on public.workout_sessions;
create policy "workout_sessions_select_own"
  on public.workout_sessions for select using (auth.uid() = user_id);
drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own"
  on public.workout_sessions for insert with check (auth.uid() = user_id);
drop policy if exists "workout_sessions_delete_own" on public.workout_sessions;
create policy "workout_sessions_delete_own"
  on public.workout_sessions for delete using (auth.uid() = user_id);

-- daily_completions
drop policy if exists "daily_completions_select_own" on public.daily_completions;
create policy "daily_completions_select_own"
  on public.daily_completions for select using (auth.uid() = user_id);
drop policy if exists "daily_completions_insert_own" on public.daily_completions;
create policy "daily_completions_insert_own"
  on public.daily_completions for insert with check (auth.uid() = user_id);
drop policy if exists "daily_completions_update_own" on public.daily_completions;
create policy "daily_completions_update_own"
  on public.daily_completions for update using (auth.uid() = user_id);

-- user_activity_meta
drop policy if exists "user_activity_meta_select_own" on public.user_activity_meta;
create policy "user_activity_meta_select_own"
  on public.user_activity_meta for select using (auth.uid() = user_id);
drop policy if exists "user_activity_meta_insert_own" on public.user_activity_meta;
create policy "user_activity_meta_insert_own"
  on public.user_activity_meta for insert with check (auth.uid() = user_id);
drop policy if exists "user_activity_meta_update_own" on public.user_activity_meta;
create policy "user_activity_meta_update_own"
  on public.user_activity_meta for update using (auth.uid() = user_id);

grant select, insert, update, delete on public.weight_entries to anon, authenticated;
grant select, insert, update, delete on public.user_workouts to anon, authenticated;
grant select, insert, delete on public.workout_sessions to anon, authenticated;
grant select, insert, update on public.daily_completions to anon, authenticated;
grant select, insert, update on public.user_activity_meta to anon, authenticated;
