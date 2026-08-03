-- Flight Coaches portal: multi-coach profiles, client assignment, reflection prompts, intro videos.

create table if not exists public.coaches (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  bio text,
  intro_video_url text,
  intro_video_ready boolean not null default false,
  onboarding jsonb not null default '{}'::jsonb,
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches (user_id) on delete cascade,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active'
    check (status in ('invited', 'active', 'ended')),
  source text not null default 'coach_brought'
    check (source in ('coach_brought', 'flight_assigned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, client_user_id)
);

create index if not exists coach_clients_coach_status_idx
  on public.coach_clients (coach_id, status);

create index if not exists coach_clients_client_idx
  on public.coach_clients (client_user_id);

create table if not exists public.coach_reflection_prompts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches (user_id) on delete cascade,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  prompt_date date not null,
  title text not null default 'Reflection',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_user_id, prompt_date)
);

create index if not exists coach_reflection_prompts_client_date_idx
  on public.coach_reflection_prompts (client_user_id, prompt_date desc);

-- Messaging: scope messages to a coach when present
alter table public.coach_messages
  add column if not exists coach_id uuid references public.coaches (user_id) on delete set null;

alter table public.coach_threads
  add column if not exists coach_id uuid references public.coaches (user_id) on delete set null;

create index if not exists coach_messages_coach_user_idx
  on public.coach_messages (coach_id, user_id, created_at desc);

-- Storage for intro videos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coach-intro-videos',
  'coach-intro-videos',
  true,
  104857600,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.coaches enable row level security;
alter table public.coach_clients enable row level security;
alter table public.coach_reflection_prompts enable row level security;

-- Coaches: read/update own row; insert own row
drop policy if exists "coaches_select_own" on public.coaches;
create policy "coaches_select_own"
  on public.coaches for select
  using (auth.uid() = user_id);

drop policy if exists "coaches_insert_own" on public.coaches;
create policy "coaches_insert_own"
  on public.coaches for insert
  with check (auth.uid() = user_id);

drop policy if exists "coaches_update_own" on public.coaches;
create policy "coaches_update_own"
  on public.coaches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Clients can read their coach's public profile fields via assignment
drop policy if exists "coaches_select_for_clients" on public.coaches;
create policy "coaches_select_for_clients"
  on public.coaches for select
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = coaches.user_id
        and cc.client_user_id = auth.uid()
        and cc.status in ('invited', 'active')
    )
  );

-- coach_clients
drop policy if exists "coach_clients_select_coach" on public.coach_clients;
create policy "coach_clients_select_coach"
  on public.coach_clients for select
  using (auth.uid() = coach_id);

drop policy if exists "coach_clients_select_client" on public.coach_clients;
create policy "coach_clients_select_client"
  on public.coach_clients for select
  using (auth.uid() = client_user_id);

drop policy if exists "coach_clients_insert_client_invite" on public.coach_clients;
create policy "coach_clients_insert_client_invite"
  on public.coach_clients for insert
  with check (auth.uid() = client_user_id);

drop policy if exists "coach_clients_update_coach" on public.coach_clients;
create policy "coach_clients_update_coach"
  on public.coach_clients for update
  using (auth.uid() = coach_id);

drop policy if exists "coach_clients_update_client" on public.coach_clients;
create policy "coach_clients_update_client"
  on public.coach_clients for update
  using (auth.uid() = client_user_id);

-- Reflections: coach CRUD via service role in portal; clients read own
drop policy if exists "coach_reflections_select_client" on public.coach_reflection_prompts;
create policy "coach_reflections_select_client"
  on public.coach_reflection_prompts for select
  using (auth.uid() = client_user_id);

drop policy if exists "coach_reflections_select_coach" on public.coach_reflection_prompts;
create policy "coach_reflections_select_coach"
  on public.coach_reflection_prompts for select
  using (auth.uid() = coach_id);

grant select, insert, update on table public.coaches to authenticated;
grant select, insert, update on table public.coach_clients to authenticated;
grant select on table public.coach_reflection_prompts to authenticated;

-- Storage policies for intro videos (path: {user_id}/intro.*)
drop policy if exists "coach_intro_videos_select" on storage.objects;
create policy "coach_intro_videos_select"
  on storage.objects for select
  using (bucket_id = 'coach-intro-videos');

drop policy if exists "coach_intro_videos_insert_own" on storage.objects;
create policy "coach_intro_videos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'coach-intro-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "coach_intro_videos_update_own" on storage.objects;
create policy "coach_intro_videos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'coach-intro-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "coach_intro_videos_delete_own" on storage.objects;
create policy "coach_intro_videos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'coach-intro-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Helper: generate invite codes for new coaches
create or replace function public.generate_coach_invite_code()
returns trigger
language plpgsql
as $$
declare
  code text;
begin
  if new.invite_code is null or new.invite_code = '' then
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    new.invite_code := code;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists coaches_invite_code on public.coaches;
create trigger coaches_invite_code
  before insert or update on public.coaches
  for each row
  execute function public.generate_coach_invite_code();

-- Mobile: accept invite by code (looks up coach, assigns client, promotes tier when free/essentials)
create or replace function public.accept_coach_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_coach_id uuid;
  v_display text;
  v_tier text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in');
  end if;

  select user_id, display_name into v_coach_id, v_display
  from public.coaches
  where upper(trim(invite_code)) = upper(trim(p_code))
  limit 1;

  if v_coach_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid invite code');
  end if;

  if v_coach_id = v_uid then
    return jsonb_build_object('ok', false, 'error', 'Cannot join yourself');
  end if;

  insert into public.coach_clients (coach_id, client_user_id, status, source)
  values (v_coach_id, v_uid, 'active', 'coach_brought')
  on conflict (coach_id, client_user_id) do update
    set status = 'active',
        updated_at = now();

  select subscription_tier into v_tier
  from public.profiles
  where id = v_uid;

  if v_tier is null or v_tier in ('free', 'essentials') then
    update public.profiles
    set subscription_tier = 'coaching'
    where id = v_uid;
    v_tier := 'coaching';
  end if;

  return jsonb_build_object(
    'ok', true,
    'coach_id', v_coach_id,
    'coach_display_name', v_display,
    'subscription_tier', v_tier
  );
end;
$$;

grant execute on function public.accept_coach_invite(text) to authenticated;
