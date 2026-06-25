-- Per-exercise logged set history for workout insights (weight/progress over time)

create table if not exists public.exercise_history (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  source_workout_id text not null,
  exercise_key text not null,
  exercise_name text not null,
  catalog_exercise_id text,
  date_key text not null,
  finished_at timestamptz not null,
  sets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists exercise_history_user_finished_desc
  on public.exercise_history (user_id, finished_at desc);

create index if not exists exercise_history_user_workout
  on public.exercise_history (user_id, source_workout_id);

alter table public.exercise_history enable row level security;

drop policy if exists "exercise_history_select_own" on public.exercise_history;
create policy "exercise_history_select_own"
  on public.exercise_history for select using (auth.uid() = user_id);

drop policy if exists "exercise_history_insert_own" on public.exercise_history;
create policy "exercise_history_insert_own"
  on public.exercise_history for insert with check (auth.uid() = user_id);

drop policy if exists "exercise_history_delete_own" on public.exercise_history;
create policy "exercise_history_delete_own"
  on public.exercise_history for delete using (auth.uid() = user_id);

grant select, insert, delete on public.exercise_history to anon, authenticated;
