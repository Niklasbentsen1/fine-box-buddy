-- 1) Medlemsstatus: pending kræver admin-godkendelse
create type public.member_status as enum ('pending', 'active');

alter table public.team_members
  add column status public.member_status not null default 'active';

-- 2) Kun aktive medlemmer tæller som medlemmer/administratorer
create or replace function public.is_team_member(_team_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = _team_id and user_id = _user_id and status = 'active'
  );
$$;

create or replace function public.is_team_admin(_team_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = _team_id and user_id = _user_id and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_club_member(_club_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.club_id = _club_id and tm.user_id = _user_id and tm.status = 'active'
  );
$$;

create or replace function public.shares_team_with(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.user_id = auth.uid() and mine.status = 'active'
      and theirs.user_id = _user_id and theirs.status = 'active'
  );
$$;

-- 3) Brugere kan altid se deres eget medlemskab (også afventende)
create policy "Users can view own membership"
on public.team_members
for select
to authenticated
using (user_id = auth.uid());

-- 4) Tilmelding via klubkode => afventende + notifikation til holdets administratorer
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
  insert into public.notifications (team_id, user_id, title, body)
  select _team_id, tm.user_id,
         'Ny anmodning til ' || t.name,
         coalesce(nullif(trim(_name), ''), 'En spiller') ||
           ' har anmodet om at blive medlem af klubben og afventer godkendelse af en administrator.'
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.team_id = _team_id and tm.role = 'admin' and tm.status = 'active';

  return _club.id;
end;
$$;

-- 5) Admin godkender et afventende medlem
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

  insert into public.notifications (team_id, user_id, title, body)
  select _team_id, _user_id,
         'Du er godkendt til ' || t.name,
         'En administrator har godkendt din anmodning — velkommen på holdet!'
  from public.teams t where t.id = _team_id;
end;
$$;

-- 6) Admin kan hente listen over afventende anmodninger (med navn)
create or replace function public.get_pending_members(_team_id uuid)
returns table(user_id uuid, display_name text, avatar_url text, requested_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select tm.user_id, p.display_name, p.avatar_url, tm.joined_at
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = _team_id and tm.status = 'pending'
    and public.is_team_admin(_team_id, auth.uid())
  order by tm.joined_at;
$$;

-- 7) Lås de nye funktioner ned til logge brugere
revoke all on function public.approve_member(uuid, uuid) from public, anon;
revoke all on function public.get_pending_members(uuid) from public, anon;
grant execute on function public.approve_member(uuid, uuid) to authenticated;
grant execute on function public.get_pending_members(uuid) to authenticated;