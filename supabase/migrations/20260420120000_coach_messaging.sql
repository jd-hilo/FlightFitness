-- Coach ↔ user messaging (Jude). Users insert only sender = 'user'; coach rows via service role.

create table if not exists public.coach_threads (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sender text not null check (sender in ('user', 'coach')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_user_created_desc
  on public.coach_messages (user_id, created_at desc);

alter table public.coach_threads enable row level security;
alter table public.coach_messages enable row level security;

-- Threads: own row only
create policy "coach_threads_select_own"
  on public.coach_threads for select
  using (auth.uid() = user_id);

create policy "coach_threads_insert_own"
  on public.coach_threads for insert
  with check (auth.uid() = user_id);

create policy "coach_threads_update_own"
  on public.coach_threads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages: read own; insert only as user (coach via service role)
create policy "coach_messages_select_own"
  on public.coach_messages for select
  using (auth.uid() = user_id);

create policy "coach_messages_insert_user_only"
  on public.coach_messages for insert
  with check (auth.uid() = user_id and sender = 'user');

-- Realtime: new coach messages for unread updates
alter publication supabase_realtime add table public.coach_messages;
