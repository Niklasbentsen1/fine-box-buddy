ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;

CREATE OR REPLACE FUNCTION public.delete_club(_club_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _team_ids uuid[];
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;

  if not exists (select 1 from public.clubs where id = _club_id) then
    raise exception 'Klubben findes ikke';
  end if;

  if not exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.club_id = _club_id
      and tm.user_id = auth.uid()
      and tm.role = 'admin'
      and tm.status = 'active'
  ) then
    raise exception 'Kun administratorer kan slette klubben';
  end if;

  select coalesce(array_agg(id), '{}') into _team_ids from public.teams where club_id = _club_id;

  delete from public.motm_votes where match_id in (select id from public.matches where team_id = any(_team_ids));
  delete from public.match_players where match_id in (select id from public.matches where team_id = any(_team_ids));
  delete from public.matches where team_id = any(_team_ids);
  delete from public.reminders where team_id = any(_team_ids);
  delete from public.notifications where team_id = any(_team_ids);
  delete from public.fines where team_id = any(_team_ids);
  delete from public.payments where team_id = any(_team_ids);
  delete from public.withdrawals where team_id = any(_team_ids);
  delete from public.fine_types where team_id = any(_team_ids);
  delete from public.team_members where team_id = any(_team_ids);
  delete from public.teams where club_id = _club_id;
  delete from public.clubs where id = _club_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.delete_club(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_club(uuid) TO authenticated;