-- Daily verse + AI hero image (one row per UTC calendar day)

create table if not exists public.daily_readings (
  day date primary key,
  verse_id text not null,
  text text not null,
  reference text not null,
  tags text[] not null default '{}',
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.daily_readings enable row level security;

drop policy if exists "daily_readings_select_authenticated" on public.daily_readings;
create policy "daily_readings_select_authenticated"
  on public.daily_readings for select
  to authenticated
  using (true);

-- Public hero images (read by app Image URI)
insert into storage.buckets (id, name, public)
values ('daily-hero', 'daily-hero', true)
on conflict (id) do update set public = true;

drop policy if exists "daily_hero_objects_public_read" on storage.objects;
create policy "daily_hero_objects_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'daily-hero');
