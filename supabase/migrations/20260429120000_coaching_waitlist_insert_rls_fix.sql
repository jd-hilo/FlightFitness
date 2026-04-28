-- Client uses the anon API key; PostgREST sessions are often the `anon` role with a user JWT.
-- A policy "TO authenticated" never applies, so every insert was denied by RLS (42501).
-- Match the pattern used on profiles/plans: no role restriction, only WITH CHECK on auth.uid().

drop policy if exists "coaching_waitlist_insert_own_session" on public.coaching_waitlist;

create policy "coaching_waitlist_insert_own_session"
  on public.coaching_waitlist for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and length(trim(email)) between 3 and 320
  );

grant insert on table public.coaching_waitlist to anon, authenticated;
