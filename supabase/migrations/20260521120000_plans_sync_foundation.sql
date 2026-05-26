-- Improve plans table for mobile ↔ coach sync (dedupe + updated_at + unique week)

alter table public.plans
  add column if not exists updated_at timestamptz not null default now();

-- Keep the newest row per user/week before enforcing uniqueness
delete from public.plans p
using public.plans p2
where p.user_id = p2.user_id
  and p.week_start = p2.week_start
  and p.created_at < p2.created_at;

create unique index if not exists plans_user_week_unique
  on public.plans (user_id, week_start);

create or replace function public.set_plans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row
  execute function public.set_plans_updated_at();
