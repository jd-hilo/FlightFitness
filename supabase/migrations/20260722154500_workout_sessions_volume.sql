-- Persist total weight moved (lb × reps) per completed session.
alter table public.workout_sessions
  add column if not exists volume_lb integer not null default 0
  check (volume_lb >= 0);
