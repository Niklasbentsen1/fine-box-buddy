create type public.team_role as enum ('admin', 'member');
create type public.payment_status as enum ('pending', 'approved', 'rejected');
create type public.match_status as enum ('open', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select on public.clubs to authenticated;
grant all on public.clubs to service_role;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
grant select on public.teams to authenticated;
grant all on public.teams to service_role;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  role public.team_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);
grant select, delete on public.team_members to authenticated;
grant all on public.team_members to service_role;

create table public.fine_types (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  label text not null,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.fine_types to authenticated;
grant all on public.fine_types to service_role;

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  fine_type_id uuid references public.fine_types(id) on delete set null,
  label text not null,
  amount numeric(10,2) not null check (amount >= 0),
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.fines to authenticated;
grant all on public.fines to service_role;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  amount numeric(10,2) not null check (amount > 0),
  note text,
  status public.payment_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  sent_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.reminders to authenticated;
grant all on public.reminders to service_role;

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent text not null,
  played_at timestamptz not null,
  voting_closes_at timestamptz not null,
  status public.match_status not null default 'open',
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.matches to authenticated;
grant all on public.matches to service_role;

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null,
  unique (match_id, user_id)
);
grant select, insert, delete on public.match_players to authenticated;
grant all on public.match_players to service_role;

create table public.motm_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  voter_id uuid not null,
  voted_for_id uuid not null,
  created_at timestamptz not null default now(),
  unique (match_id, voter_id)
);
grant select, insert on public.motm_votes to authenticated;
grant all on public.motm_votes to service_role;

create index idx_team_members_user on public.team_members(user_id);
create index idx_fines_team on public.fines(team_id);
create index idx_fines_user on public.fines(user_id);
create index idx_payments_team on public.payments(team_id);
create index idx_payments_user on public.payments(user_id);
create index idx_matches_team on public.matches(team_id);
create index idx_match_players_match on public.match_players(match_id);
create index idx_motm_votes_match on public.motm_votes(match_id);

create or replace function public.is_team_member(_team_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = _team_id and user_id = _user_id);
$$;

create or replace function public.is_team_admin(_team_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = _team_id and user_id = _user_id and role = 'admin');
$$;

create or replace function public.is_club_member(_club_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.club_id = _club_id and tm.user_id = _user_id
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(coalesce(new.email, 'spiller'), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_club(_name text, _team_name text)
returns json language plpgsql security definer set search_path = public as $$
declare
  _club_id uuid;
  _team_id uuid;
  _code text;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  loop
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.clubs where invite_code = _code);
  end loop;
  insert into public.clubs (name, invite_code, created_by) values (trim(_name), _code, auth.uid()) returning id into _club_id;
  insert into public.teams (club_id, name) values (_club_id, trim(_team_name)) returning id into _team_id;
  insert into public.team_members (team_id, user_id, role) values (_team_id, auth.uid(), 'admin');
  return json_build_object('club_id', _club_id, 'team_id', _team_id, 'invite_code', _code);
end;
$$;

create or replace function public.join_club_by_code(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _club public.clubs%rowtype;
  _team_id uuid;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  select * into _club from public.clubs where invite_code = upper(trim(_code));
  if not found then raise exception 'Klubkoden findes ikke'; end if;
  if public.is_club_member(_club.id, auth.uid()) then raise exception 'Du er allerede medlem af denne klub'; end if;
  select id into _team_id from public.teams where club_id = _club.id order by created_at asc limit 1;
  if _team_id is null then raise exception 'Klubben har ingen hold'; end if;
  insert into public.team_members (team_id, user_id, role) values (_team_id, auth.uid(), 'member');
  return _club.id;
end;
$$;

create or replace function public.create_team(_club_id uuid, _name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _team_id uuid;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  if not public.is_club_member(_club_id, auth.uid()) then raise exception 'Du er ikke medlem af klubben'; end if;
  insert into public.teams (club_id, name) values (_club_id, trim(_name)) returning id into _team_id;
  insert into public.team_members (team_id, user_id, role) values (_team_id, auth.uid(), 'admin');
  return _team_id;
end;
$$;

create or replace function public.join_team(_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _club_id uuid;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  select club_id into _club_id from public.teams where id = _team_id;
  if _club_id is null then raise exception 'Holdet findes ikke'; end if;
  if not public.is_club_member(_club_id, auth.uid()) then raise exception 'Du er ikke medlem af klubben'; end if;
  insert into public.team_members (team_id, user_id, role) values (_team_id, auth.uid(), 'member')
  on conflict (team_id, user_id) do nothing;
end;
$$;

alter table public.profiles enable row level security;
create policy "Signed-in users can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.clubs enable row level security;
create policy "Club members can view club" on public.clubs for select to authenticated using (public.is_club_member(id, auth.uid()));

alter table public.teams enable row level security;
create policy "Club members can view teams" on public.teams for select to authenticated using (public.is_club_member(club_id, auth.uid()));

alter table public.team_members enable row level security;
create policy "Members can view teammates" on public.team_members for select to authenticated using (public.is_team_member(team_id, auth.uid()));
create policy "Admins can remove members and users can leave" on public.team_members for delete to authenticated using (public.is_team_admin(team_id, auth.uid()) or user_id = auth.uid());

alter table public.fine_types enable row level security;
create policy "Members can view fine types" on public.fine_types for select to authenticated using (public.is_team_member(team_id, auth.uid()));
create policy "Admins can add fine types" on public.fine_types for insert to authenticated with check (public.is_team_admin(team_id, auth.uid()));
create policy "Admins can update fine types" on public.fine_types for update to authenticated using (public.is_team_admin(team_id, auth.uid())) with check (public.is_team_admin(team_id, auth.uid()));
create policy "Admins can delete fine types" on public.fine_types for delete to authenticated using (public.is_team_admin(team_id, auth.uid()));

alter table public.fines enable row level security;
create policy "Members can view fines" on public.fines for select to authenticated using (public.is_team_member(team_id, auth.uid()));
create policy "Admins can give fines" on public.fines for insert to authenticated with check (public.is_team_admin(team_id, auth.uid()) and created_by = auth.uid() and public.is_team_member(team_id, user_id));
create policy "Admins can delete fines" on public.fines for delete to authenticated using (public.is_team_admin(team_id, auth.uid()));

alter table public.payments enable row level security;
create policy "Members can view payments" on public.payments for select to authenticated using (public.is_team_member(team_id, auth.uid()));
create policy "Members can create own pending payments" on public.payments for insert to authenticated with check (user_id = auth.uid() and status = 'pending' and public.is_team_member(team_id, auth.uid()));
create policy "Admins can review payments" on public.payments for update to authenticated using (public.is_team_admin(team_id, auth.uid())) with check (public.is_team_admin(team_id, auth.uid()));

alter table public.withdrawals enable row level security;
create policy "Members can view withdrawals" on public.withdrawals for select to authenticated using (public.is_team_member(team_id, auth.uid()));
create policy "Admins can withdraw" on public.withdrawals for insert to authenticated with check (public.is_team_admin(team_id, auth.uid()) and created_by = auth.uid());

alter table public.reminders enable row level security;
create policy "Recipients and admins can view reminders" on public.reminders for select to authenticated using (user_id = auth.uid() or public.is_team_admin(team_id, auth.uid()));
create policy "Admins can send reminders" on public.reminders for insert to authenticated with check (public.is_team_admin(team_id, auth.uid()) and sent_by = auth.uid());

alter table public.matches enable row level security;
create policy "Members can view matches" on public.matches for select to authenticated using (public.is_team_member(team_id, auth.uid()));
create policy "Admins can create matches" on public.matches for insert to authenticated with check (public.is_team_admin(team_id, auth.uid()) and created_by = auth.uid());
create policy "Admins can update matches" on public.matches for update to authenticated using (public.is_team_admin(team_id, auth.uid())) with check (public.is_team_admin(team_id, auth.uid()));
create policy "Admins can delete matches" on public.matches for delete to authenticated using (public.is_team_admin(team_id, auth.uid()));

alter table public.match_players enable row level security;
create policy "Members can view match players" on public.match_players for select to authenticated using (exists (select 1 from public.matches m where m.id = match_id and public.is_team_member(m.team_id, auth.uid())));
create policy "Admins can add match players" on public.match_players for insert to authenticated with check (exists (select 1 from public.matches m where m.id = match_id and public.is_team_admin(m.team_id, auth.uid())));
create policy "Admins can remove match players" on public.match_players for delete to authenticated using (exists (select 1 from public.matches m where m.id = match_id and public.is_team_admin(m.team_id, auth.uid())));

alter table public.motm_votes enable row level security;
create policy "Members can view votes" on public.motm_votes for select to authenticated using (exists (select 1 from public.matches m where m.id = match_id and public.is_team_member(m.team_id, auth.uid())));
create policy "Participants can vote while open" on public.motm_votes for insert to authenticated with check (
  voter_id = auth.uid()
  and voted_for_id <> auth.uid()
  and exists (select 1 from public.match_players mp where mp.match_id = motm_votes.match_id and mp.user_id = auth.uid())
  and exists (select 1 from public.match_players mp2 where mp2.match_id = motm_votes.match_id and mp2.user_id = voted_for_id)
  and exists (select 1 from public.matches m where m.id = motm_votes.match_id and m.status = 'open' and m.voting_closes_at > now())
);