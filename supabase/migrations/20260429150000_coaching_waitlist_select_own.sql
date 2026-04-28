-- Let signed-in users read their own waitlist row so the app can restore “waitlist joined” UI on the paywall.

drop policy if exists "coaching_waitlist_select_own" on public.coaching_waitlist;

create policy "coaching_waitlist_select_own"
  on public.coaching_waitlist for select
  using (
    auth.uid() is not null
    and user_id = auth.uid()
  );

grant select on table public.coaching_waitlist to anon, authenticated;
