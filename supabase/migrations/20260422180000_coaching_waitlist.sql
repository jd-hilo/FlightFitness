-- Users join the Coaching waitlist with email (ties to auth user when available).

create table if not exists public.coaching_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists coaching_waitlist_email_lower_unique
  on public.coaching_waitlist (lower(email));

create index if not exists coaching_waitlist_created_desc
  on public.coaching_waitlist (created_at desc);

alter table public.coaching_waitlist enable row level security;

-- Signed-in users (including anonymous auth) can add themselves to the waitlist.
create policy "coaching_waitlist_insert_own_session"
  on public.coaching_waitlist for insert
  to authenticated
  with check (
    length(trim(email)) between 3 and 320
    and user_id = auth.uid()
  );

-- No public reads; coach dashboard can use service role to export.
