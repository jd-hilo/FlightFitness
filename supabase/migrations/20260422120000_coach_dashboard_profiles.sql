-- Coach dashboard: human-readable profile fields + coach read cursor for threads

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

alter table public.coach_threads
  add column if not exists coach_last_read_at timestamptz;

-- Mobile: refetch when coach updates plan payload (idempotent if re-run)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'plans'
  ) then
    execute 'alter publication supabase_realtime add table public.plans';
  end if;
end $$;
