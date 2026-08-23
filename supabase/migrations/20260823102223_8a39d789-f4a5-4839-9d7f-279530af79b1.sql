CREATE OR REPLACE FUNCTION public.get_club_team_member_counts(_club_id uuid)
RETURNS TABLE(team_id uuid, team_name text, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id AS team_id,
         t.name AS team_name,
         COUNT(tm.id)::bigint AS member_count
  FROM public.teams t
  LEFT JOIN public.team_members tm
    ON tm.team_id = t.id
   AND tm.status = 'active'
  WHERE t.club_id = _club_id
    AND public.is_club_member(_club_id, auth.uid())
  GROUP BY t.id, t.name, t.created_at
  ORDER BY t.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_team_member_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_team_member_counts(uuid) TO service_role;