-- 1) Allow deleting a match together with its players and votes
alter table public.match_players drop constraint match_players_match_id_fkey;
alter table public.match_players
  add constraint match_players_match_id_fkey
  foreign key (match_id) references public.matches(id) on delete cascade;

alter table public.motm_votes drop constraint motm_votes_match_id_fkey;
alter table public.motm_votes
  add constraint motm_votes_match_id_fkey
  foreign key (match_id) references public.matches(id) on delete cascade;

-- 2) Notifications table
create table public.notifications (
  id uuid not null default gen_random_uuid() primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Users can view own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "Users can mark own notifications as read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Notify a player when added to a match (voting start + deadline)
create or replace function public.notify_match_player_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _m public.matches%rowtype;
begin
  select * into _m from public.matches where id = new.match_id;
  if not found then return new; end if;
  insert into public.notifications (team_id, user_id, title, body)
  values (
    _m.team_id,
    new.user_id,
    'Du er tilføjet til kamp mod ' || _m.opponent,
    'Afstemningen om kampens spiller er åben nu og lukker ' ||
      to_char(_m.voting_closes_at at time zone 'Europe/Copenhagen', 'DD.MM.YYYY "kl." HH24:MI') || '.'
  );
  return new;
end;
$$;
revoke all on function public.notify_match_player_added() from public, anon, authenticated;

create trigger on_match_player_added
  after insert on public.match_players
  for each row execute function public.notify_match_player_added();

-- 4) Notify the whole team with anonymous results when a voting closes
create or replace function public.notify_match_results()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _results text;
begin
  if old.status = 'closed' or new.status <> 'closed' then
    return new;
  end if;

  select coalesce(
           string_agg(
             name || ' — ' || votes || ' ' || case when votes = 1 then 'stemme' else 'stemmer' end,
             E'\n' order by votes desc, name
           ),
           'Ingen stemmer blev afgivet.'
         )
  into _results
  from (
    select p.display_name as name, count(v.id) as votes
    from public.match_players mp
    join public.profiles p on p.id = mp.user_id
    left join public.motm_votes v on v.match_id = mp.match_id and v.voted_for_id = mp.user_id
    where mp.match_id = new.id
    group by p.display_name
  ) s;

  insert into public.notifications (team_id, user_id, title, body)
  select new.team_id, tm.user_id,
    'Afstemning afsluttet: ' || new.opponent,
    'Stemmernes fordeling for kampen mod ' || new.opponent || ' (alle stemmer er anonyme):' || E'\n' || _results
  from public.team_members tm
  where tm.team_id = new.team_id;

  return new;
end;
$$;
revoke all on function public.notify_match_results() from public, anon, authenticated;

create trigger on_match_closed
  after update of status on public.matches
  for each row execute function public.notify_match_results();

-- 5) Auto-close expired votings so results are always sent out
create or replace function public.close_expired_votings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
  set status = 'closed'
  where status = 'open' and voting_closes_at <= now();
end;
$$;
revoke all on function public.close_expired_votings() from public, anon, authenticated;

create extension if not exists pg_cron;
do $cron$
begin
  if exists (select 1 from cron.job where jobname = 'close-expired-votings') then
    perform cron.unschedule('close-expired-votings');
  end if;
end
$cron$;
select cron.schedule('close-expired-votings', '*/15 * * * *', 'select public.close_expired_votings()');