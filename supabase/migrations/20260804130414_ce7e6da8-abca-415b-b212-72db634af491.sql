-- Make MOTM votes truly anonymous: only the voter can read their own vote row.
-- Everyone else only ever sees aggregated counts via the security-definer functions below.

DROP POLICY "Members can view votes" ON public.motm_votes;

CREATE POLICY "Voters can view own vote"
ON public.motm_votes
FOR SELECT
TO authenticated
USING (voter_id = auth.uid());

-- Anonymous per-match vote counts for all added players (includes players with 0 votes)
CREATE OR REPLACE FUNCTION public.get_match_vote_counts(_match_id uuid)
RETURNS TABLE (user_id uuid, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select mp.user_id, count(v.id) as votes
  from public.match_players mp
  left join public.motm_votes v
    on v.match_id = mp.match_id and v.voted_for_id = mp.user_id
  where mp.match_id = _match_id
    and exists (
      select 1 from public.matches m
      where m.id = _match_id and public.is_team_member(m.team_id, auth.uid())
    )
  group by mp.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_match_vote_counts(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_match_vote_counts(uuid) TO authenticated;

-- Anonymous season leaderboard across all of the team's matches
CREATE OR REPLACE FUNCTION public.get_team_motm_leaderboard(_team_id uuid)
RETURNS TABLE (user_id uuid, display_name text, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select v.voted_for_id as user_id, p.display_name, count(*) as votes
  from public.motm_votes v
  join public.matches m on m.id = v.match_id
  join public.profiles p on p.id = v.voted_for_id
  where m.team_id = _team_id
    and public.is_team_member(_team_id, auth.uid())
  group by v.voted_for_id, p.display_name
  order by votes desc, p.display_name;
$$;

REVOKE ALL ON FUNCTION public.get_team_motm_leaderboard(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_team_motm_leaderboard(uuid) TO authenticated;