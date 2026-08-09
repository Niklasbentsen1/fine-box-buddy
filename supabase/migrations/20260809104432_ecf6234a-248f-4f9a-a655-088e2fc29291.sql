create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- 1. Device tokens ---------------------------------------------------------
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'ios',
  environment text not null default 'production',
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id) where disabled_at is null;

grant select, insert, update, delete on public.device_tokens to authenticated;
grant all on public.device_tokens to service_role;

alter table public.device_tokens enable row level security;

create policy "Users manage own device tokens"
on public.device_tokens for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 2. Notification preferences ---------------------------------------------
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  fine_received boolean not null default true,
  payment_approved boolean not null default true,
  payment_rejected boolean not null default true,
  payment_reminder boolean not null default true,
  motm_opened boolean not null default true,
  motm_result boolean not null default true,
  membership_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;

alter table public.notification_preferences enable row level security;

create policy "Users manage own notification preferences"
on public.notification_preferences for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 3. notifications: additive columns only ----------------------------------
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists pushed_at timestamptz;

create index if not exists notifications_pending_push_idx
  on public.notifications (created_at)
  where pushed_at is null;

-- 4. updated_at triggers ----------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists device_tokens_touch_updated_at on public.device_tokens;
create trigger device_tokens_touch_updated_at
before update on public.device_tokens
for each row execute function public.touch_updated_at();

drop trigger if exists notification_preferences_touch_updated_at on public.notification_preferences;
create trigger notification_preferences_touch_updated_at
before update on public.notification_preferences
for each row execute function public.touch_updated_at();

-- 5. Dispatcher: calls the push edge function when configured ---------------
create or replace function public.dispatch_push_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _url text;
  _secret text;
begin
  select decrypted_secret into _url from vault.decrypted_secrets where name = 'push_dispatch_url';
  select decrypted_secret into _secret from vault.decrypted_secrets where name = 'push_dispatch_secret';

  if _url is null or _secret is null then
    return; -- push er ikke konfigureret endnu
  end if;

  if not exists (
    select 1 from public.notifications where pushed_at is null and created_at > now() - interval '1 day'
  ) then
    return;
  end if;

  perform extensions.net_http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', _secret),
    body := jsonb_build_object('mode', 'drain')
  );
end;
$$;

revoke all on function public.dispatch_push_notifications() from public, anon, authenticated;

select cron.unschedule('dispatch-push-notifications')
where exists (select 1 from cron.job where jobname = 'dispatch-push-notifications');

select cron.schedule('dispatch-push-notifications', '* * * * *', $$select public.dispatch_push_notifications();$$);