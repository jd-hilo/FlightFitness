-- Upserts need UPDATE (push uses onConflict user_id,id).
drop policy if exists "exercise_history_update_own" on public.exercise_history;
create policy "exercise_history_update_own"
  on public.exercise_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update on public.exercise_history to anon, authenticated;
