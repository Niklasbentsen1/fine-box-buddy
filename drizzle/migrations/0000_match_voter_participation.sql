CREATE OR REPLACE FUNCTION public.get_match_voter_participation(_match_id uuid)
RETURNS TABLE(user_id uuid, display_name text, nickname text, has_voted boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mp.user_id,
         p.display_name,
         p.nickname,
         EXISTS (
           SELECT 1 FROM motm_votes v
           WHERE v.match_id = mp.match_id AND v.voter_id = mp.user_id
         ) AS has_voted
  FROM match_players mp
  JOIN matches m ON m.id = mp.match_id
  LEFT JOIN profiles p ON p.id = mp.user_id
  WHERE mp.match_id = _match_id
    AND is_team_admin(m.team_id, auth.uid())
  ORDER BY p.display_name;
$$;

REVOKE ALL ON FUNCTION public.get_match_voter_participation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_match_voter_participation(uuid) TO authenticated;