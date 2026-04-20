-- Schedule daily-content Edge Function to run every day at 00:05 America/New_York
-- (EST in winter = 05:05 UTC, EDT in summer = 04:05 UTC) so the image + verse row
-- are ready before any user opens the app.
--
-- pg_cron schedules are evaluated in UTC, so to stay DST-aware we schedule BOTH
-- UTC times and let the job body check "is it actually 00:05 in New York right now?".
-- The daily-content function is idempotent (returns cached row if already generated),
-- so even if both fire on a rare edge case it's safe.
--
-- Requires two project-level settings (run ONCE in the hosted SQL editor):
--   alter database postgres set app.settings.project_url = 'https://<project>.supabase.co';
--   alter database postgres set app.settings.cron_secret = '<same value as CRON_SECRET edge secret>';

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any prior schedules with these names so re-running the migration is safe.
do $$
begin
  perform cron.unschedule('daily-content-warm');
exception when others then null;
end
$$;

do $$
begin
  perform cron.unschedule('daily-content-warm-est');
exception when others then null;
end
$$;

do $$
begin
  perform cron.unschedule('daily-content-warm-edt');
exception when others then null;
end
$$;

-- Winter (EST = UTC-5): 00:05 EST == 05:05 UTC
select
  cron.schedule(
    'daily-content-warm-est',
    '5 5 * * *',
    $cron$
    select
      case
        when to_char(now() at time zone 'America/New_York', 'HH24:MI') = '00:05' then
          net.http_post(
            url := current_setting('app.settings.project_url', true) || '/functions/v1/daily-content',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', current_setting('app.settings.cron_secret', true)
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 120000
          )
        else null
      end;
    $cron$
  );

-- Summer (EDT = UTC-4): 00:05 EDT == 04:05 UTC
select
  cron.schedule(
    'daily-content-warm-edt',
    '5 4 * * *',
    $cron$
    select
      case
        when to_char(now() at time zone 'America/New_York', 'HH24:MI') = '00:05' then
          net.http_post(
            url := current_setting('app.settings.project_url', true) || '/functions/v1/daily-content',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', current_setting('app.settings.cron_secret', true)
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 120000
          )
        else null
      end;
    $cron$
  );
