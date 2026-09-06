CREATE TABLE public.match_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_groups TO authenticated;
GRANT ALL ON public.match_groups TO service_role;

ALTER TABLE public.match_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view match groups" ON public.match_groups
  FOR SELECT TO authenticated USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "Admins can create match groups" ON public.match_groups
  FOR INSERT TO authenticated WITH CHECK (public.is_team_admin(team_id, auth.uid()));
CREATE POLICY "Admins can update match groups" ON public.match_groups
  FOR UPDATE TO authenticated USING (public.is_team_admin(team_id, auth.uid())) WITH CHECK (public.is_team_admin(team_id, auth.uid()));
CREATE POLICY "Admins can delete match groups" ON public.match_groups
  FOR DELETE TO authenticated USING (public.is_team_admin(team_id, auth.uid()));

ALTER TABLE public.matches ADD COLUMN group_id uuid REFERENCES public.match_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_matches_group_id ON public.matches(group_id);

INSERT INTO public.match_groups (team_id, name)
SELECT DISTINCT m.team_id, 'Standard' FROM public.matches m WHERE m.group_id IS NULL;

UPDATE public.matches m
SET group_id = g.id
FROM public.match_groups g
WHERE g.team_id = m.team_id AND g.name = 'Standard' AND m.group_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_group_motm_leaderboard(_group_id uuid)
RETURNS TABLE(user_id uuid, display_name text, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select v.voted_for_id as user_id, p.display_name, count(*) as votes
  from public.motm_votes v
  join public.matches m on m.id = v.match_id
  join public.profiles p on p.id = v.voted_for_id
  where m.group_id = _group_id
    and m.status = 'closed'
    and public.is_team_member(m.team_id, auth.uid())
  group by v.voted_for_id, p.display_name
  order by votes desc, p.display_name;
$$;

REVOKE ALL ON FUNCTION public.get_group_motm_leaderboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_motm_leaderboard(uuid) TO authenticated;