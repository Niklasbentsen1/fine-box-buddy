create extension if not exists pg_net;

create table public.device_tokens (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'ios',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, token)
);
grant select, insert, update, delete on public.device_tokens to authenticated;
grant all on public.device_tokens to service_role;
alter table public.device_tokens enable row level security;
create policy "Users manage own device tokens"
  on public.device_tokens for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.push_config (
  key text primary key,
  value text not null
);
grant all on public.push_config to service_role;
alter table public.push_config enable row level security;

insert into public.push_config (key, value)
values ('hook_secret', encode(gen_random_bytes(32), 'hex'));

create or replace function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hook_secret text;
begin
  select value into hook_secret from public.push_config where key = 'hook_secret';

  perform net.http_post(
    url := 'https://project--06b787bc-8ccf-47c4-9007-605ab08ac5d7.lovable.app/api/public/send-push',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-hook-secret', coalesce(hook_secret, '')
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'user_id', new.user_id,
        'title', new.title,
        'body', new.body
      )
    )
  );
  return new;
end;
$$;

create trigger on_notification_send_push
  after insert on public.notifications
  for each row execute function public.dispatch_push_notification();