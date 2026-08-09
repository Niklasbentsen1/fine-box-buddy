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
    return;
  end if;

  if not exists (
    select 1 from public.notifications where pushed_at is null and created_at > now() - interval '1 day'
  ) then
    return;
  end if;

  perform net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', _secret),
    body := jsonb_build_object('mode', 'drain')
  );
end;
$$;

revoke all on function public.dispatch_push_notifications() from public, anon, authenticated;