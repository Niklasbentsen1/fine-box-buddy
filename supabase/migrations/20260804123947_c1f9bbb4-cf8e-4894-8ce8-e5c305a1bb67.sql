create or replace function public.set_team_member_role(_team_id uuid, _user_id uuid, _role team_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  if not public.is_team_admin(_team_id, auth.uid()) then raise exception 'Kun administratorer kan ændre roller'; end if;
  if not public.is_team_member(_team_id, _user_id) then raise exception 'Spilleren er ikke medlem af holdet'; end if;
  if _role = 'member' and not exists (
    select 1 from public.team_members
    where team_id = _team_id and role = 'admin' and user_id <> _user_id
  ) then
    raise exception 'Holdet skal have mindst én administrator'; end if;
  update public.team_members set role = _role where team_id = _team_id and user_id = _user_id;
end;
$$;

revoke all on function public.set_team_member_role(uuid, uuid, team_role) from public, anon;
grant execute on function public.set_team_member_role(uuid, uuid, team_role) to authenticated;