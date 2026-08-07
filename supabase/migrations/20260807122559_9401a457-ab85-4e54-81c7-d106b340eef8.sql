-- 1) Link-felt på notifikationer, så appen kan navigere til den relevante side ved klik
alter table public.notifications add column if not exists link text;

-- 2) Spiller tilføjet til kamp → link til kampssiden
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
  insert into public.notifications (team_id, user_id, title, body, link)
  values (
    _m.team_id,
    new.user_id,
    'Du er tilføjet til kamp mod ' || _m.opponent,
    'Afstemningen om kampens spiller er åben nu og lukker ' ||
      to_char(_m.voting_closes_at at time zone 'Europe/Copenhagen', 'DD.MM.YYYY "kl." HH24:MI') || '.',
    '/kampe/' || new.match_id
  );
  return new;
end;
$$;
revoke all on function public.notify_match_player_added() from public, anon, authenticated;

-- 3) Afstemning afsluttet → link til kampssiden
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

  insert into public.notifications (team_id, user_id, title, body, link)
  select new.team_id, tm.user_id,
    'Afstemning afsluttet: ' || new.opponent,
    'Stemmernes fordeling for kampen mod ' || new.opponent || ' (alle stemmer er anonyme):' || E'\n' || _results,
    '/kampe/' || new.id
  from public.team_members tm
  where tm.team_id = new.team_id;

  return new;
end;
$$;
revoke all on function public.notify_match_results() from public, anon, authenticated;

-- 4) Ny klubtilmelding → admin-notifikation linker til Hold-siden
create or replace function public.join_club_by_code(_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _club public.clubs%rowtype;
  _team_id uuid;
  _existing public.member_status;
  _name text;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;

  select * into _club from public.clubs where invite_code = upper(trim(_code));
  if not found then raise exception 'Klubkoden findes ikke'; end if;

  select tm.status into _existing
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where t.club_id = _club.id and tm.user_id = auth.uid()
  limit 1;
  if _existing = 'active' then raise exception 'Du er allerede medlem af denne klub'; end if;
  if _existing = 'pending' then raise exception 'Din anmodning afventer allerede godkendelse'; end if;

  select id into _team_id from public.teams where club_id = _club.id order by created_at asc limit 1;
  if _team_id is null then raise exception 'Klubben har ingen hold'; end if;

  insert into public.team_members (team_id, user_id, role, status)
  values (_team_id, auth.uid(), 'member', 'pending');

  select display_name into _name from public.profiles where id = auth.uid();
  insert into public.notifications (team_id, user_id, title, body, link)
  select _team_id, tm.user_id,
         'Ny anmodning til ' || t.name,
         coalesce(nullif(trim(_name), ''), 'En spiller') ||
           ' har anmodet om at blive medlem af klubben og afventer godkendelse af en administrator.',
         '/hold'
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.team_id = _team_id and tm.role = 'admin' and tm.status = 'active';

  return _club.id;
end;
$$;

-- 5) Godkendt medlem → notifikation linker til Hjem
create or replace function public.approve_member(_team_id uuid, _user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  if not public.is_team_admin(_team_id, auth.uid()) then raise exception 'Kun administratorer kan godkende medlemmer'; end if;

  update public.team_members set status = 'active'
  where team_id = _team_id and user_id = _user_id and status = 'pending';
  if not found then raise exception 'Ingen afventende anmodning fundet'; end if;

  insert into public.notifications (team_id, user_id, title, body, link)
  select _team_id, _user_id,
         'Du er godkendt til ' || t.name,
         'En administrator har godkendt din anmodning — velkommen på holdet!',
         '/hjem'
  from public.teams t where t.id = _team_id;
end;
$$;

-- 6) Samlet MOTM-stilling tæller kun afsluttede afstemninger
create or replace function public.get_team_motm_leaderboard(_team_id uuid)
returns table (user_id uuid, display_name text, votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.voted_for_id as user_id, p.display_name, count(*) as votes
  from public.motm_votes v
  join public.matches m on m.id = v.match_id
  join public.profiles p on p.id = v.voted_for_id
  where m.team_id = _team_id
    and m.status = 'closed'
    and public.is_team_member(_team_id, auth.uid())
  group by v.voted_for_id, p.display_name
  order by votes desc, p.display_name;
$$;
revoke all on function public.get_team_motm_leaderboard(uuid) from public, anon;
grant execute on function public.get_team_motm_leaderboard(uuid) to authenticated;

-- 7) Offentlig kluboversigt: alle klubber i appen med antal aktive medlemmer
create or replace function public.get_all_clubs()
returns table (id uuid, name text, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name,
    (select count(distinct tm.user_id)
     from public.team_members tm
     join public.teams t on t.id = tm.team_id
     where t.club_id = c.id and tm.status = 'active') as member_count
  from public.clubs c
  where auth.uid() is not null
  order by c.name;
$$;
revoke all on function public.get_all_clubs() from public, anon;
grant execute on function public.get_all_clubs() to authenticated;