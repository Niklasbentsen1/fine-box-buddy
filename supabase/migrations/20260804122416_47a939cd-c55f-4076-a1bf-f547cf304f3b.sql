ALTER TABLE public.teams ADD COLUMN mobilepay_number text;

ALTER TABLE public.teams ADD CONSTRAINT teams_mobilepay_number_format
  CHECK (mobilepay_number IS NULL OR mobilepay_number ~ '^\d{8}$');

CREATE POLICY "Team admins can update team" ON public.teams
  FOR UPDATE TO authenticated
  USING (is_team_admin(id, auth.uid()))
  WITH CHECK (is_team_admin(id, auth.uid()));