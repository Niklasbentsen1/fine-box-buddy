ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS leave_requested_at timestamptz;

CREATE OR REPLACE FUNCTION public.request_leave_team(_team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;

  update public.team_members
  set leave_requested_at = now()
  where team_id = _team_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Du er ikke aktivt medlem af holdet'; end if;

  insert into public.notifications (team_id, user_id, title, body, link)
  select _team_id, tm.user_id,
         (select p.display_name from public.profiles p where p.id = auth.uid()) || ' vil forlade holdet',
         'En spiller har anmodet om at forlade holdet — godkend eller afvis under Hold.',
         '/hold'
  from public.team_members tm
  where tm.team_id = _team_id and tm.role = 'admin' and tm.status = 'active';
end;
$$;

CREATE OR REPLACE FUNCTION public.cancel_leave_request(_team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  update public.team_members set leave_requested_at = null
  where team_id = _team_id and user_id = auth.uid();
end;
$$;

CREATE OR REPLACE FUNCTION public.get_leaving_members(_team_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, requested_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select tm.user_id, p.display_name, p.avatar_url, tm.leave_requested_at
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = _team_id and tm.status = 'active' and tm.leave_requested_at is not null
    and public.is_team_admin(_team_id, auth.uid())
  order by tm.leave_requested_at;
$$;

CREATE OR REPLACE FUNCTION public.approve_leave_team(_team_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  if not public.is_team_admin(_team_id, auth.uid()) then raise exception 'Kun administratorer kan godkende dette'; end if;

  delete from public.team_members
  where team_id = _team_id and user_id = _user_id and leave_requested_at is not null;
  if not found then raise exception 'Ingen anmodning fundet'; end if;

  insert into public.notifications (team_id, user_id, title, body, link)
  select _team_id, _user_id,
         'Du har forladt ' || t.name,
         'En administrator har godkendt din anmodning om at forlade holdet.',
         '/hjem'
  from public.teams t where t.id = _team_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.reject_leave_team(_team_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  if not public.is_team_admin(_team_id, auth.uid()) then raise exception 'Kun administratorer kan afvise dette'; end if;

  update public.team_members set leave_requested_at = null
  where team_id = _team_id and user_id = _user_id;

  insert into public.notifications (team_id, user_id, title, body, link)
  select _team_id, _user_id,
         'Din anmodning blev afvist',
         'En administrator har afvist din anmodning om at forlade ' || t.name || '.',
         '/hold'
  from public.teams t where t.id = _team_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare
  _uid uuid := auth.uid();
begin
  if _uid is null then raise exception 'Ikke logget ind'; end if;

  delete from public.motm_votes where voter_id = _uid or nominee_id = _uid;
  delete from public.match_players where user_id = _uid;
  delete from public.reminders where user_id = _uid;
  delete from public.notifications where user_id = _uid;
  delete from public.fines where user_id = _uid or created_by = _uid;
  delete from public.payments where user_id = _uid;
  delete from public.team_members where user_id = _uid;
  delete from public.profiles where id = _uid;
  delete from auth.users where id = _uid;
end;
$$;

REVOKE ALL ON FUNCTION public.request_leave_team(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.cancel_leave_request(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_leaving_members(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.approve_leave_team(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.reject_leave_team(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.delete_own_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_leave_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_leave_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaving_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_leave_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_leave_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;