REVOKE EXECUTE ON FUNCTION public.shares_team_with(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_team(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_match_vote_counts(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.shares_team_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_vote_counts(uuid) TO authenticated;

-- Klubkoden må kun læses af klubbens administratorer
REVOKE SELECT ON public.clubs FROM authenticated, anon;
GRANT SELECT (id, name, created_by, created_at) ON public.clubs TO authenticated;

CREATE OR REPLACE FUNCTION public.get_club_invite_code(_club_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select c.invite_code
  from public.clubs c
  where c.id = _club_id
    and exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where t.club_id = c.id
        and tm.user_id = auth.uid()
        and tm.role = 'admin'
        and tm.status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.get_club_invite_code(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_club_invite_code(uuid) TO authenticated;