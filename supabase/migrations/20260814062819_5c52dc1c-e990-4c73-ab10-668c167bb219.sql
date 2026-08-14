DROP FUNCTION IF EXISTS public.get_match_vote_counts(uuid);
CREATE OR REPLACE FUNCTION public.get_match_vote_counts(_match_id uuid)
RETURNS TABLE(user_id uuid, display_name text, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select v.voted_for_id as user_id, p.display_name, count(*) as votes
  from public.motm_votes v
  join public.profiles p on p.id = v.voted_for_id
  where v.match_id = _match_id
    and exists (
      select 1 from public.matches m
      where m.id = _match_id and public.is_team_member(m.team_id, auth.uid())
    )
  group by v.voted_for_id, p.display_name;
$$;