-- Allow users to update their own workout session rows (needed for duration edits + upsert).
drop policy if exists "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own"
  on public.workout_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update on public.workout_sessions to anon, authenticated;
