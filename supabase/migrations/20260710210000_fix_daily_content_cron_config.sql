-- Fix daily-content cron: app.settings.* GUC params are not settable on hosted
-- Supabase (permission denied), so the previous schedule posted a null URL every night.
-- Store config in private.cron_config and read it from the job body instead.
--
-- After migrate, set the secret once (SQL editor or CLI), matching Edge Function CRON_SECRET:
--   insert into private.cron_config(key, value) values
--     ('project_url', 'https://<project-ref>.supabase.co'),
--     ('cron_secret', '<same as CRON_SECRET edge secret>')
--   on conflict (key) do update set value = excluded.value, updated_at = now();

create schema if not exists private;

create table if not exists private.cron_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on schema private from public;
revoke all on private.cron_config from public;
revoke all on schema private from anon, authenticated;
revoke all on private.cron_config from anon, authenticated;

-- Safe default URL for this project (secret must still be set separately).
insert into private.cron_config(key, value) values
  ('project_url', 'https://gdenhlzrvxsekdfzulii.supabase.co')
on conflict (key) do update
  set value = excluded.value, updated_at = now();

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
            url := (select value from private.cron_config where key = 'project_url')
              || '/functions/v1/daily-content',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', (select value from private.cron_config where key = 'cron_secret')
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
            url := (select value from private.cron_config where key = 'project_url')
              || '/functions/v1/daily-content',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', (select value from private.cron_config where key = 'cron_secret')
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 120000
          )
        else null
      end;
    $cron$
  );
