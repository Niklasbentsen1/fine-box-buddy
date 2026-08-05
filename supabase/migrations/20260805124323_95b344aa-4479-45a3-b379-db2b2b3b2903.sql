CREATE OR REPLACE FUNCTION public.delete_team(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _club_id uuid;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;

  select club_id into _club_id from public.teams where id = _team_id;
  if _club_id is null then raise exception 'Holdet findes ikke'; end if;

  -- Caller must be an active admin of a team in the same club
  if not exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.club_id = _club_id
      and tm.user_id = auth.uid()
      and tm.role = 'admin'
      and tm.status = 'active'
  ) then
    raise exception 'Kun administratorer kan slette hold';
  end if;

  -- A club must always have at least one team (join by code targets the first team)
  if (select count(*) from public.teams where club_id = _club_id) <= 1 then
    raise exception 'Klubben skal have mindst ét hold — opret et nyt hold, før du sletter dette';
  end if;

  delete from public.motm_votes where match_id in (select id from public.matches where team_id = _team_id);
  delete from public.match_players where match_id in (select id from public.matches where team_id = _team_id);
  delete from public.matches where team_id = _team_id;
  delete from public.reminders where team_id = _team_id;
  delete from public.notifications where team_id = _team_id;
  delete from public.fines where team_id = _team_id;
  delete from public.payments where team_id = _team_id;
  delete from public.withdrawals where team_id = _team_id;
  delete from public.fine_types where team_id = _team_id;
  delete from public.team_members where team_id = _team_id;
  delete from public.teams where id = _team_id;
end;
$$;