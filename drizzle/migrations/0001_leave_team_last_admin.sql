CREATE OR REPLACE FUNCTION public.leave_team_as_last_admin(_team_id uuid, _new_admin_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _club_id uuid;
  _other_admins int;
  _other_members int;
  _team_name text;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;

  if not exists (
    select 1 from public.team_members
    where team_id = _team_id and user_id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Kun holdets administrator kan bruge dette';
  end if;

  select t.club_id, t.name into _club_id, _team_name from public.teams t where t.id = _team_id;
  if _club_id is null then raise exception 'Holdet findes ikke'; end if;

  select count(*) into _other_admins from public.team_members
  where team_id = _team_id and user_id <> auth.uid() and role = 'admin' and status = 'active';
  if _other_admins > 0 then
    raise exception 'Holdet har allerede andre administratorer';
  end if;

  select count(*) into _other_members from public.team_members
  where team_id = _team_id and user_id <> auth.uid();

  if _new_admin_id is not null then
    if not exists (
      select 1 from public.team_members
      where team_id = _team_id and user_id = _new_admin_id and status = 'active' and user_id <> auth.uid()
    ) then
      raise exception 'Den valgte spiller er ikke aktivt medlem af holdet';
    end if;

    update public.team_members set role = 'admin', leave_requested_at = null
    where team_id = _team_id and user_id = _new_admin_id;

    delete from public.team_members where team_id = _team_id and user_id = auth.uid();

    insert into public.notifications (team_id, user_id, title, body, link)
    values (_team_id, _new_admin_id, 'Du er nu administrator for ' || _team_name,
            'Den tidligere administrator har forladt holdet og overdraget rollen til dig.', '/hold');

    return 'transferred';
  end if;

  if _other_members > 0 then
    raise exception 'Vælg en ny administrator, før du kan forlade holdet';
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

  if not exists (select 1 from public.teams where club_id = _club_id) then
    delete from public.clubs where id = _club_id;
    return 'team_and_club_deleted';
  end if;

  return 'team_deleted';
end;
$function$;

REVOKE ALL ON FUNCTION public.leave_team_as_last_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_team_as_last_admin(uuid, uuid) TO authenticated;
