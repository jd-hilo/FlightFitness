-- Saved daily macro targets (onboarding + Fuel tab)

alter table public.profiles
  add column if not exists macro_targets jsonb;
