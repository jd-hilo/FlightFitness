-- Client-chosen first name for greetings (Home, coach copy, etc.)

alter table public.profiles
  add column if not exists first_name text;

comment on column public.profiles.first_name is
  'Given name for in-app greetings; optional; user-controlled.';
